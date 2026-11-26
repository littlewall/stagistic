import {
    parseBackups,
    periodicBackupName,
    staleBackups,
} from './backupFiles';

export interface BackupWriterPorts {
    /** Moves whenever script data is written (see readDataChangeMarker). */
    readMarker: () => Promise<string>,
    dump: () => Promise<Uint8Array>,
    writeFile: (name: string, bytes: Uint8Array) => Promise<void>,
    listNames: () => Promise<string[]>,
    removeFiles: (names: string[]) => Promise<void>,
    now: () => Date,
}

/*
 * Writes periodic and shutdown backups only when data changed since the last
 * successful backup. The change signal is the marker, not the dump: gzip
 * output differs for identical data.
 *
 * The marker is read before the dump, so a write during the dump leaves the
 * backup marked as older than the data and the next run writes again.
 */
export const createBackupWriter = (ports: BackupWriterPorts) => {
    // undefined: not established yet; null: no backup covers the data.
    let backedUpMarker: string | null | undefined;
    let queue: Promise<unknown> = Promise.resolve();

    const serial = <T>(task: () => Promise<T>): Promise<T> => {
        const result = queue.then(task, task);

        queue = result.catch(() => undefined);

        return result;
    };

    const hasBackup = async () => {
        try {
            return parseBackups(await ports.listNames()).some(entry => entry.kind === 'periodic');
        } catch {
            return false;
        }
    };

    const establish = async () => {
        if (backedUpMarker === undefined) {
            backedUpMarker = await hasBackup() ? await ports.readMarker() : null;
        }
    };

    const write = async (marker: string) => {
        const bytes = await ports.dump();
        const now = ports.now();

        await ports.writeFile(periodicBackupName(now), bytes);
        backedUpMarker = marker;
        await ports.removeFiles(staleBackups(await ports.listNames(), now));
    };

    return {
        /*
         * Call once the database is ready: data already on disk counts as
         * backed up when any backup exists, so an idle app writes none.
         */
        start: () => serial(establish),
        /** Resolves whether a file was written. */
        writeIfChanged: () => serial(async () => {
            await establish();

            const marker = await ports.readMarker();

            if (marker === backedUpMarker) {
                return false;
            }

            await write(marker);

            return true;
        }),
        /** The safety backup before a restore: written even when nothing changed. */
        writeAlways: () => serial(async () => {
            await write(await ports.readMarker());
        }),
    };
};

export type BackupWriter = ReturnType<typeof createBackupWriter>;
