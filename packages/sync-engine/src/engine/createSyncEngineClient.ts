import * as Y from 'yjs';

import {
    type BroadcastSync,
    createBroadcastSync,
    type CreateBroadcastSyncOptions,
} from '../tabs/broadcastSync';
import {isBodyDocEmpty} from '../ydoc/bodyCodec';
import {
    bodyDocName,
    type ControlChannelFactory,
    createControlChannel,
    type EngineRequest,
    isEngineMessage,
    metaDocName,
    type OpenResult,
} from './protocol';

/*
 * Tab side of the engine: Y.Doc replicas kept in sync with the leader over
 * BroadcastChannel. Requests are retried when a new leader announces itself,
 * so a leader handoff only delays them.
 */

export interface OpenedScript {
    scriptId: string,
    body: Y.Doc,
    meta: Y.Doc,
    schemaVersion: number | null,
    /** Resolves once the engine has this replica's state in the projection. */
    flush(): Promise<void>,
    release(): void,
}

export interface SyncEngineClient {
    openScript(scriptId: string): Promise<OpenedScript>,
    notifyBodyReplaced(scriptId: string): Promise<void>,
    notifyScriptDeleted(scriptId: string): Promise<void>,
    destroy(): void,
}

export interface CreateSyncEngineClientArgs {
    controlChannelFactory?: ControlChannelFactory,
    docChannelFactory?: CreateBroadcastSyncOptions['channelFactory'],
    /** Re-send interval while no engine answers (e.g. leader still booting). */
    retryMs?: number,
    timeoutMs?: number,
}

type RequestBody = EngineRequest extends infer R ? R extends EngineRequest ? Omit<R, 'requestId'> : never : never;

interface Pending {
    request: EngineRequest,
    resolve: (result: OpenResult | undefined) => void,
    reject: (error: Error) => void,
    retry: ReturnType<typeof setInterval>,
    timeout: ReturnType<typeof setTimeout>,
}

interface Replica {
    body: Y.Doc,
    meta: Y.Doc,
    syncs: BroadcastSync[],
    refs: number,
}

export const createSyncEngineClient = ({
    controlChannelFactory = createControlChannel,
    docChannelFactory,
    retryMs = 1_000,
    timeoutMs = 30_000,
}: CreateSyncEngineClientArgs = {}): SyncEngineClient => {
    const channel = controlChannelFactory();
    const pending = new Map<string, Pending>();
    const replicas = new Map<string, Replica>();

    const send = (body: RequestBody) => new Promise<OpenResult | undefined>((resolve, reject) => {
        const request = {...body, requestId: crypto.randomUUID()} as EngineRequest;
        const settle = () => {
            clearInterval(entry.retry);
            clearTimeout(entry.timeout);
            pending.delete(request.requestId);
        };
        const entry: Pending = {
            request,
            resolve: result => {
                settle();
                resolve(result);
            },
            reject: error => {
                settle();
                reject(error);
            },
            retry: setInterval(() => channel.postMessage(request), retryMs),
            timeout: setTimeout(() => entry.reject(new Error(`sync engine did not answer ${request.type}`)), timeoutMs),
        };

        pending.set(request.requestId, entry);
        channel.postMessage(request);
    });

    const waitForContent = (doc: Y.Doc) => new Promise<void>(resolve => {
        if (!isBodyDocEmpty(doc)) {
            resolve();

            return;
        }

        const check = () => {
            if (!isBodyDocEmpty(doc)) {
                doc.off('update', check);
                resolve();
            }
        };

        doc.on('update', check);
    });

    const handleMessage = (event: {data: unknown}) => {
        const message = event.data;

        if (!isEngineMessage(message)) {
            return;
        }

        if (message.type === 'reply') {
            const entry = pending.get(message.requestId);

            if (message.ok) {
                entry?.resolve(message.result);
            } else {
                entry?.reject(new Error(message.error));
            }

            return;
        }

        if (message.type === 'engine-started') {
            // New leader: re-open replicas (it loads them from IndexedDB) and re-sync.
            for (const [scriptId, replica] of replicas) {
                void send({type: 'open', scriptId})
                    .then(() => replica.syncs.forEach(sync => sync.resync()))
                    .catch(() => {});
            }

            pending.forEach(entry => channel.postMessage(entry.request));
        }
    };

    channel.addEventListener('message', handleMessage);

    const openScript: SyncEngineClient['openScript'] = async scriptId => {
        let replica = replicas.get(scriptId);

        if (!replica) {
            const body = new Y.Doc({gc: true});
            const meta = new Y.Doc({gc: true});

            replica = {
                body,
                meta,
                refs: 0,
                syncs: [
                    createBroadcastSync(body, bodyDocName(scriptId), {channelFactory: docChannelFactory}),
                    createBroadcastSync(meta, metaDocName(scriptId), {channelFactory: docChannelFactory}),
                ],
            };
            replicas.set(scriptId, replica);
        }

        replica.refs++;

        const opened = replica;
        const result = await send({type: 'open', scriptId});

        // The engine joined the doc channels only now: pull its state.
        opened.syncs.forEach(sync => sync.resync());
        await waitForContent(opened.body);

        let released = false;

        return {
            scriptId,
            body: opened.body,
            meta: opened.meta,
            schemaVersion: result?.schemaVersion ?? null,
            flush: async () => {
                await send({
                    type: 'flush',
                    scriptId,
                    stateVector: Y.encodeStateVector(opened.body),
                });
            },
            release: () => {
                if (released) {
                    return;
                }

                released = true;
                opened.refs--;

                if (opened.refs === 0) {
                    opened.syncs.forEach(sync => sync.destroy());
                    opened.body.destroy();
                    opened.meta.destroy();
                    replicas.delete(scriptId);
                }
            },
        };
    };

    return {
        openScript,
        notifyBodyReplaced: async scriptId => {
            await send({type: 'body-replaced', scriptId});
        },
        notifyScriptDeleted: async scriptId => {
            await send({type: 'script-deleted', scriptId});
        },
        destroy: () => {
            channel.removeEventListener('message', handleMessage);
            channel.close();
            pending.forEach(entry => entry.reject(new Error('sync engine client destroyed')));
            replicas.forEach(replica => {
                replica.syncs.forEach(sync => sync.destroy());
                replica.body.destroy();
                replica.meta.destroy();
            });
            replicas.clear();
        },
    };
};
