import type {ScriptDocument} from '@stagistic/script';
import * as Y from 'yjs';

import {createBroadcastSync, type CreateBroadcastSyncOptions} from '../tabs/broadcastSync';
import {
    bodyDocToScriptDocument,
    isBodyDocEmpty,
    replaceBodyContent,
    seedBodyDoc,
} from '../ydoc/bodyCodec';
import {
    getMetaMap,
    readSchemaVersion,
    resolveSchemaGate,
    SCHEMA_VERSION_KEY,
} from '../ydoc/mapCodec';
import type {DocPersistence} from './persistence';
import {prepareSeedDocument} from './prepareSeed';
import {
    bodyDocName,
    type ControlChannelFactory,
    createControlChannel,
    metaDocName,
    type OpenResult,
} from './protocol';
import {serveEngineRequests} from './serveEngineRequests';
import {stateVectorCovers} from './stateVectorCovers';

/*
 * Local sync engine. Runs only in the PGlite leader worker (one per browser
 * profile), so it is the single writer of Y.Doc seeds and of the projection:
 * - seeds a script's body Y.Doc from the projection exactly once (invariant 1)
 * - persists Y.Docs in IndexedDB and serves tab replicas over BroadcastChannel
 * - writes the projection (debounced) from the Y.Doc (invariant 4)
 */

export interface ProjectionStore {
    loadDocument(scriptId: string): Promise<ScriptDocument | null>,
    writeDocument(scriptId: string, document: ScriptDocument): Promise<void>,
}

export interface CreateSyncEngineArgs {
    store: ProjectionStore,
    persistence: DocPersistence,
    clientSchemaVersion: number,
    controlChannelFactory?: ControlChannelFactory,
    docChannelFactory?: CreateBroadcastSyncOptions['channelFactory'],
    projectionDelayMs?: number,
    projectionMaxDelayMs?: number,
    flushTimeoutMs?: number,
    log?: (message: string, error?: unknown) => void,
}

export const SEED_ORIGIN = 'sync-engine:seed';
export const REPLACE_ORIGIN = 'sync-engine:replace';

interface ScriptEntry {
    scriptId: string,
    body: Y.Doc,
    meta: Y.Doc,
    dispose: () => Promise<void>,
    timer: ReturnType<typeof setTimeout> | null,
    firstPendingAt: number | null,
    writes: Promise<void>,
    /** Body changed since the last projection write. */
    dirty: boolean,
    /** Seeded from the projection when this entry was created. */
    seededOnOpen: boolean,
}

export interface SyncEngine {
    readonly engineId: string,
    /** Opens (and seeds once) a script; used by the control channel and tests. */
    open(scriptId: string): Promise<OpenResult>,
    flush(scriptId: string, stateVector?: Uint8Array): Promise<void>,
    bodyReplaced(scriptId: string): Promise<void>,
    scriptDeleted(scriptId: string): Promise<void>,
    stop(): Promise<void>,
}

export const createSyncEngine = ({
    store,
    persistence,
    clientSchemaVersion,
    controlChannelFactory = createControlChannel,
    docChannelFactory,
    projectionDelayMs = 400,
    projectionMaxDelayMs = 2_000,
    flushTimeoutMs = 5_000,
    log = (message, error) => console.error(`[sync-engine] ${message}`, error),
}: CreateSyncEngineArgs): SyncEngine => {
    const engineId = crypto.randomUUID();
    const entries = new Map<string, Promise<ScriptEntry>>();
    const channel = controlChannelFactory();

    const isWritable = (entry: ScriptEntry) => resolveSchemaGate(readSchemaVersion(entry.meta), clientSchemaVersion) === 'writable';

    const writeProjection = (entry: ScriptEntry, {force = false} = {}) => {
        if (entry.timer) {
            clearTimeout(entry.timer);
            entry.timer = null;
        }

        entry.firstPendingAt = null;

        if (!entry.dirty && !force) {
            return entry.writes;
        }

        entry.dirty = false;
        entry.writes = entry.writes
            .then(async () => {
                // An older engine must not project content it does not understand.
                if (isWritable(entry)) {
                    await store.writeDocument(entry.scriptId, bodyDocToScriptDocument(entry.body));
                }
            })
            .catch(error => log(`projection failed for ${entry.scriptId}`, error));

        return entry.writes;
    };

    const scheduleProjection = (entry: ScriptEntry) => {
        const now = Date.now();

        entry.dirty = true;
        entry.firstPendingAt ??= now;

        if (entry.timer) {
            clearTimeout(entry.timer);
        }

        const delay = Math.max(0, Math.min(projectionDelayMs, entry.firstPendingAt + projectionMaxDelayMs - now));

        entry.timer = setTimeout(() => void writeProjection(entry), delay);
    };

    const createEntry = async (scriptId: string): Promise<ScriptEntry> => {
        const body = new Y.Doc({gc: true});
        const meta = new Y.Doc({gc: true});
        const [bodyStore, metaStore] = await Promise.all([
            persistence.bind(bodyDocName(scriptId), body),
            persistence.bind(metaDocName(scriptId), meta),
        ]);
        const metaMap = getMetaMap(meta);
        const entry: ScriptEntry = {
            scriptId,
            body,
            meta,
            timer: null,
            firstPendingAt: null,
            writes: Promise.resolve(),
            dirty: false,
            seededOnOpen: false,
            dispose: async () => {},
        };

        if (isBodyDocEmpty(body)) {
            const seed = prepareSeedDocument(await store.loadDocument(scriptId));

            meta.transact(() => {
                metaMap.set(SCHEMA_VERSION_KEY, clientSchemaVersion);
            }, SEED_ORIGIN);
            seedBodyDoc(body, seed, SEED_ORIGIN);
            entry.seededOnOpen = true;
            // Normalization may have changed the stored document.
            await writeProjection(entry, {force: true});
        } else {
            const stored = readSchemaVersion(meta);

            if (stored === null || stored < clientSchemaVersion) {
                // No body migrations exist yet; future ones must be idempotent (AGENTS.md).
                meta.transact(() => metaMap.set(SCHEMA_VERSION_KEY, clientSchemaVersion), SEED_ORIGIN);
            }
        }

        const bodySync = createBroadcastSync(body, bodyDocName(scriptId), {channelFactory: docChannelFactory});
        const metaSync = createBroadcastSync(meta, metaDocName(scriptId), {channelFactory: docChannelFactory});
        const onBodyUpdate = (_update: Uint8Array, origin: unknown) => {
            if (origin !== SEED_ORIGIN) {
                scheduleProjection(entry);
            }
        };

        body.on('update', onBodyUpdate);

        entry.dispose = async () => {
            body.off('update', onBodyUpdate);
            bodySync.destroy();
            metaSync.destroy();
            await Promise.all([bodyStore.destroy(), metaStore.destroy()]);
            body.destroy();
            meta.destroy();
        };

        return entry;
    };

    const getEntry = (scriptId: string) => {
        let entry = entries.get(scriptId);

        if (!entry) {
            entry = createEntry(scriptId);
            entries.set(scriptId, entry);
            entry.catch(() => entries.delete(scriptId));
        }

        return entry;
    };

    const open: SyncEngine['open'] = async scriptId => {
        const entry = await getEntry(scriptId);

        return {schemaVersion: readSchemaVersion(entry.meta)};
    };

    const waitForState = (doc: Y.Doc, stateVector: Uint8Array) => new Promise<void>(resolve => {
        if (stateVectorCovers(Y.encodeStateVector(doc), stateVector)) {
            resolve();

            return;
        }

        const timeout = setTimeout(() => {
            doc.off('update', check);
            log('flush timed out waiting for replica updates');
            resolve();
        }, flushTimeoutMs);
        const check = () => {
            if (stateVectorCovers(Y.encodeStateVector(doc), stateVector)) {
                clearTimeout(timeout);
                doc.off('update', check);
                resolve();
            }
        };

        doc.on('update', check);
    });

    const flush: SyncEngine['flush'] = async (scriptId, stateVector) => {
        const entry = await getEntry(scriptId);

        if (stateVector) {
            await waitForState(entry.body, stateVector);
        }

        await writeProjection(entry);
    };

    const bodyReplaced: SyncEngine['bodyReplaced'] = async scriptId => {
        const existed = entries.has(scriptId);
        const entry = await getEntry(scriptId);

        // A fresh seed already reads the rewritten projection.
        if (!existed && entry.seededOnOpen) {
            return;
        }

        const stored = await store.loadDocument(scriptId);

        // Replace as Y ops on top of the history, never a reset (invariant 8).
        replaceBodyContent(entry.body, prepareSeedDocument(stored), REPLACE_ORIGIN);
        await writeProjection(entry, {force: true});
    };

    const scriptDeleted: SyncEngine['scriptDeleted'] = async scriptId => {
        const entry = entries.get(scriptId);

        entries.delete(scriptId);

        if (entry) {
            const resolved = await entry;

            if (resolved.timer) {
                clearTimeout(resolved.timer);
            }

            await resolved.writes;
            await resolved.dispose();
        }

        await Promise.all([persistence.clear(bodyDocName(scriptId)), persistence.clear(metaDocName(scriptId))]);
    };

    const server = serveEngineRequests(channel, {
        open,
        flush,
        bodyReplaced,
        scriptDeleted,
    }, log);

    channel.postMessage({type: 'engine-started', engineId});

    const stop: SyncEngine['stop'] = async () => {
        server.stop();
        channel.close();

        const all = await Promise.allSettled(entries.values());

        entries.clear();

        for (const result of all) {
            if (result.status === 'fulfilled') {
                await writeProjection(result.value);
                await result.value.dispose();
            }
        }
    };

    return {
        engineId,
        open,
        flush,
        bodyReplaced,
        scriptDeleted,
        stop,
    };
};
