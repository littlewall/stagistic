import * as Y from 'yjs';

import {
    type BroadcastSync,
    createBroadcastSync,
    type CreateBroadcastSyncOptions,
} from '../tabs/broadcastSync';
import {isBodyDocEmpty} from '../ydoc/bodyCodec';
import {isEmptyChanges, type RecordChanges} from '../ydoc/recordsCodec';
import type {
    CloudCheckReport,
    CloudStatus,
    ConflictResolution,
} from './cloud/types';
import {
    bodyDocName,
    type ControlChannelFactory,
    createControlChannel,
    docChannelName,
    type EngineRequest,
    isEngineMessage,
    metaDocName,
    type OpenResult,
} from './protocol';
import type {RecordsKind} from './scriptRecords';

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

/** Cloud sync controls; all work happens in the leader's engine. */
export interface SyncEngineCloudClient {
    status(): Promise<CloudStatus>,
    /** The auth client signed in (or out) in this tab. */
    signedIn(): Promise<CloudStatus>,
    signedOut(): Promise<CloudStatus>,
    /** Post-sign-in classification; show a dialog only if it has conflicts. */
    check(): Promise<CloudCheckReport>,
    apply(resolutions: Record<string, ConflictResolution>): Promise<void>,
    /** Catch-up pass; call when the tab becomes visible again. */
    wake(): Promise<CloudStatus>,
    /** Fetches a missing attachment blob into local storage; false if not possible. */
    downloadAttachment(storageKey: string): Promise<boolean>,
    onStatus(listener: (status: CloudStatus) => void): () => void,
}

export interface SyncEngineClient {
    openScript(scriptId: string): Promise<OpenedScript>,
    /** Mirrors a repository mutation (projection before/after) into the script's Y.Doc. */
    applyRecordChanges(scriptId: string, kind: RecordsKind, changes: RecordChanges): Promise<void>,
    /** Resolves once the projection holds the script (incl. this tab's open replica). */
    flushScript(scriptId: string): Promise<void>,
    /** The projection was rewritten outside the engine (package restore). */
    notifyScriptReplaced(scriptId: string): Promise<void>,
    notifyScriptDeleted(scriptId: string): Promise<void>,
    /** Scripts whose local state the engine replaced: views must re-open them. */
    onScriptsReset(listener: (scriptIds: string[]) => void): () => void,
    cloud: SyncEngineCloudClient,
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
    resolve: (result: unknown) => void,
    reject: (error: Error) => void,
    retry: ReturnType<typeof setInterval>,
    timeout: ReturnType<typeof setTimeout>,
}

interface Replica {
    body: Y.Doc,
    meta: Y.Doc,
    syncs: BroadcastSync[],
    channelId: string | null,
    refs: number,
}

/** Cloud check/apply walk the whole library. */
const CLOUD_TIMEOUT_MS = 10 * 60_000;

export const createSyncEngineClient = ({
    controlChannelFactory = createControlChannel,
    docChannelFactory,
    retryMs = 1_000,
    timeoutMs = 30_000,
}: CreateSyncEngineClientArgs = {}): SyncEngineClient => {
    const channel = controlChannelFactory();
    const pending = new Map<string, Pending>();
    const replicas = new Map<string, Replica>();
    const statusListeners = new Set<(status: CloudStatus) => void>();
    const resetListeners = new Set<(scriptIds: string[]) => void>();

    const send = <T = undefined>(body: RequestBody, options: {timeoutMs?: number} = {}) => new Promise<T>((resolve, reject) => {
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
                resolve(result as T);
            },
            reject: error => {
                settle();
                reject(error);
            },
            retry: setInterval(() => channel.postMessage(request), retryMs),
            timeout: setTimeout(() => entry.reject(new Error(`sync engine did not answer ${request.type}`)), options.timeoutMs ?? timeoutMs),
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

    /** (Re)binds a replica to the engine docs' channels and pulls their state. */
    const bind = (scriptId: string, replica: Replica, channelId: string) => {
        if (replica.channelId !== channelId) {
            replica.syncs.forEach(sync => sync.destroy());
            replica.syncs = [
                createBroadcastSync(replica.body, docChannelName(bodyDocName(scriptId), channelId), {channelFactory: docChannelFactory}),
                createBroadcastSync(replica.meta, docChannelName(metaDocName(scriptId), channelId), {channelFactory: docChannelFactory}),
            ];
            replica.channelId = channelId;
        }

        replica.syncs.forEach(sync => sync.resync());
    };

    const destroyReplica = (scriptId: string, replica: Replica) => {
        replica.syncs.forEach(sync => sync.destroy());
        replica.body.destroy();
        replica.meta.destroy();
        replicas.delete(scriptId);
    };

    const handleMessage = (event: {data: unknown}) => {
        const message = event.data;

        if (!isEngineMessage(message)) {
            return;
        }

        switch (message.type) {
            case 'reply': {
                const entry = pending.get(message.requestId);

                if (message.ok) {
                    entry?.resolve(message.result);
                } else {
                    entry?.reject(new Error(message.error));
                }

                break;
            }
            case 'engine-started':
                // New leader: re-open replicas (it loads them from IndexedDB) and re-sync on its channels.
                for (const [scriptId, replica] of replicas) {
                    void send<OpenResult>({type: 'open', scriptId})
                        .then(result => bind(scriptId, replica, result.channelId))
                        .catch(() => {});
                }

                pending.forEach(entry => channel.postMessage(entry.request));
                break;
            case 'scripts-reset':
                // These replicas hold a discarded history: drop them unsynced.
                for (const scriptId of message.scriptIds) {
                    const replica = replicas.get(scriptId);

                    if (replica) {
                        destroyReplica(scriptId, replica);
                    }
                }

                resetListeners.forEach(listener => listener(message.scriptIds));
                break;
            case 'cloud-status':
                statusListeners.forEach(listener => listener(message.status));
                break;
            default:
                break;
        }
    };

    channel.addEventListener('message', handleMessage);

    const openScript: SyncEngineClient['openScript'] = async scriptId => {
        let replica = replicas.get(scriptId);
        const retain = !replica;

        if (!replica) {
            replica = {
                body: new Y.Doc({gc: true}),
                meta: new Y.Doc({gc: true}),
                syncs: [],
                channelId: null,
                refs: 0,
            };
            replicas.set(scriptId, replica);
        }

        replica.refs++;

        const opened = replica;
        const result = await send<OpenResult>({
            type: 'open',
            scriptId,
            retain,
        });

        bind(scriptId, opened, result.channelId);
        await waitForContent(opened.body);

        let released = false;

        return {
            scriptId,
            body: opened.body,
            meta: opened.meta,
            schemaVersion: result.schemaVersion,
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

                if (opened.refs === 0 && replicas.get(scriptId) === opened) {
                    destroyReplica(scriptId, opened);
                    void send({type: 'release', scriptId}).catch(() => {});
                }
            },
        };
    };

    const cloudAction = <T>(action: 'status' | 'signed-in' | 'signed-out' | 'check' | 'wake') => send<T>({type: 'cloud', action}, {timeoutMs: CLOUD_TIMEOUT_MS});

    return {
        openScript,
        applyRecordChanges: async (scriptId, kind, changes) => {
            if (!isEmptyChanges(changes)) {
                await send({
                    type: 'apply-records',
                    scriptId,
                    kind,
                    changes,
                });
            }
        },
        flushScript: async scriptId => {
            const replica = replicas.get(scriptId);

            // Include this tab's edits that may still be on their way to the engine.
            await send({
                type: 'flush',
                scriptId,
                ...replica ? {stateVector: Y.encodeStateVector(replica.body)} : {},
            });
        },
        notifyScriptReplaced: async scriptId => {
            await send({type: 'script-replaced', scriptId});
        },
        notifyScriptDeleted: async scriptId => {
            await send({type: 'script-deleted', scriptId});
        },
        onScriptsReset: listener => {
            resetListeners.add(listener);

            return () => resetListeners.delete(listener);
        },
        cloud: {
            status: () => cloudAction<CloudStatus>('status'),
            signedIn: () => cloudAction<CloudStatus>('signed-in'),
            signedOut: () => cloudAction<CloudStatus>('signed-out'),
            check: () => cloudAction<CloudCheckReport>('check'),
            wake: () => cloudAction<CloudStatus>('wake'),
            downloadAttachment: storageKey => send<boolean>({type: 'attachment-download', storageKey}, {timeoutMs: CLOUD_TIMEOUT_MS}),
            apply: resolutions => send({type: 'cloud-apply', resolutions}, {timeoutMs: CLOUD_TIMEOUT_MS}),
            onStatus: listener => {
                statusListeners.add(listener);

                return () => statusListeners.delete(listener);
            },
        },
        destroy: () => {
            channel.removeEventListener('message', handleMessage);
            channel.close();
            pending.forEach(entry => entry.reject(new Error('sync engine client destroyed')));
            [...replicas].forEach(([scriptId, replica]) => destroyReplica(scriptId, replica));
        },
    };
};
