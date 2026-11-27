import type {PremigrationBackup, PremigrationBackupStore} from './premigrationBackup';

/*
 * A pre-migration backup store whose storage lives on the page's side of the
 * worker, for apps whose worker has no file access (the Mac app: Tauri IPC
 * exists on the main thread only). The worker posts the dump and waits for the
 * page to confirm it has been written, so migrations never run ahead of it.
 */
const DUMP_TYPE = 'stagistic-premigration-dump';
const ACK_TYPE = 'stagistic-premigration-dump-ack';

export const DEFAULT_DUMP_ACK_TIMEOUT_MS = 60_000;

interface DumpMessage {
    type: typeof DUMP_TYPE,
    id: number,
    backup: PremigrationBackup,
}

interface AckMessage {
    type: typeof ACK_TYPE,
    id: number,
    error?: string,
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export const parseDumpMessage = (data: unknown): DumpMessage | null => {
    if (!isRecord(data) || data.type !== DUMP_TYPE || typeof data.id !== 'number' || !isRecord(data.backup)) {
        return null;
    }

    return data as unknown as DumpMessage;
};

const parseAckMessage = (data: unknown): AckMessage | null => {
    if (!isRecord(data) || data.type !== ACK_TYPE || typeof data.id !== 'number') {
        return null;
    }

    return data as unknown as AckMessage;
};

interface WorkerSidePorts {
    post: (message: DumpMessage, transfer: Transferable[]) => void,
    listen: (handler: (data: unknown) => void) => () => void,
    timeoutMs?: number,
}

/** Worker side. `load` is always empty: the page decides what an earlier file means. */
export const createPortPremigrationBackupStore = ({
    post,
    listen,
    timeoutMs = DEFAULT_DUMP_ACK_TIMEOUT_MS,
}: WorkerSidePorts): PremigrationBackupStore => {
    let nextId = 0;

    return {
        save: backup => new Promise<void>((resolve, reject) => {
            nextId += 1;

            const id = nextId;
            const finish = (error?: Error) => {
                clearTimeout(timer);
                stopListening();

                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            };
            const timer = setTimeout(() => finish(new Error('The page did not confirm the backup in time.')), timeoutMs);
            const stopListening = listen(data => {
                const ack = parseAckMessage(data);

                if (ack?.id === id) {
                    finish(ack.error === undefined ? undefined : new Error(ack.error));
                }
            });

            post({
                type: DUMP_TYPE,
                id,
                backup,
            }, [backup.data]);
        }),
        clear: () => Promise.resolve(),
        load: () => Promise.resolve(null),
    };
};

interface PageWorkerEvents {
    addEventListener: (type: 'message', handler: (event: MessageEvent) => void) => void,
    removeEventListener: (type: 'message', handler: (event: MessageEvent) => void) => void,
    postMessage: (message: AckMessage) => void,
}

/** Page side: hands each dump to `write` and tells the worker how it went. Returns a stop function. */
export const answerPremigrationDumps = (
    worker: PageWorkerEvents,
    write: (backup: PremigrationBackup) => Promise<void>,
): () => void => {
    const handle = (event: MessageEvent) => {
        const message = parseDumpMessage(event.data);

        if (!message) {
            return;
        }

        write(message.backup).then(
            () => worker.postMessage({type: ACK_TYPE, id: message.id}),
            (error: unknown) => worker.postMessage({
                type: ACK_TYPE,
                id: message.id,
                error: error instanceof Error ? error.message : String(error),
            }),
        );
    };

    worker.addEventListener('message', handle);

    return () => worker.removeEventListener('message', handle);
};
