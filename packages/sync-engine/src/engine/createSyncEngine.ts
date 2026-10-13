
import {
    replaceBodyContent,
} from '../ydoc/bodyCodec';
import {
    readSchemaVersion,
} from '../ydoc/mapCodec';
import {
    applyRecordChanges,
    readRecords,
    replaceRecords,
} from '../ydoc/recordsCodec';
import type {CloudSync} from './cloud/cloudSync';
import {createEngineCloud, runCloudAction} from './cloud/engineCloud';
import {
    type CreateSyncEngineArgs,
    RECORDS_ORIGIN,
    REPLACE_ORIGIN,
    type ScriptEntry,
    type SyncEngine,
} from './engineTypes';
import {prepareSeedDocument} from './prepareSeed';
import {
    bodyDocName,
    type CloudAction,
    commentsDocName,
    createControlChannel,
    metaDocName,
} from './protocol';
import {createScriptEntryFactory} from './scriptEntry';
import {
    RECORD_COLLECTIONS,
    RECORD_KINDS,
} from './scriptRecords';
import {serveEngineRequests} from './serveEngineRequests';
import {waitForStateVector} from './stateVectorCovers';

/*
 * Local sync engine. Runs only in the PGlite leader worker (one per browser
 * profile), so it is the single writer of Y.Doc seeds and of the projection:
 * - seeds a script's Y.Docs (body, meta, comments) from the projection exactly once
 * - persists Y.Docs in IndexedDB and serves tab replicas over BroadcastChannel
 * - writes the projection (debounced) from the Y.Docs
 * - mirrors repository mutations of records into the Y.Docs (`applyRecords`)
 */

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
    cloud: cloudConfig,
}: CreateSyncEngineArgs): SyncEngine => {
    const engineId = crypto.randomUUID();
    const entries = new Map<string, Promise<ScriptEntry>>();
    const channel = controlChannelFactory();
    /** Replicas open in tabs per script (open/release requests). */
    const tabRefs = new Map<string, number>();
    let cloud: CloudSync | null = null;

    const {createEntry, isWritable} = createScriptEntryFactory({
        store,
        persistence,
        clientSchemaVersion,
        docChannelFactory,
        projectionDelayMs,
        projectionMaxDelayMs,
        log,
        onLocalChange: scriptId => cloud?.localChange(scriptId),
    });

    const getEntry = (scriptId: string, {seed = true}: {seed?: boolean} = {}) => {
        let entry = entries.get(scriptId);

        if (!entry) {
            entry = createEntry(scriptId, seed);
            entries.set(scriptId, entry);
            entry.catch(() => entries.delete(scriptId));
        }

        return entry;
    };

    const writeAll = async (entry: ScriptEntry) => {
        await entry.lanes.body.write();
        await entry.lanes.meta.write();
        await entry.lanes.comments.write();
    };

    const open: SyncEngine['open'] = async scriptId => {
        const entry = await getEntry(scriptId);

        return {schemaVersion: readSchemaVersion(entry.records.meta), channelId: entry.channelId};
    };

    const openFromTab = async (scriptId: string, retain: boolean) => {
        if (retain) {
            tabRefs.set(scriptId, (tabRefs.get(scriptId) ?? 0) + 1);
        }

        const result = await open(scriptId);

        cloud?.tabOpened(scriptId);

        return result;
    };

    const release = (scriptId: string) => {
        const refs = (tabRefs.get(scriptId) ?? 0) - 1;

        if (refs > 0) {
            tabRefs.set(scriptId, refs);
        } else {
            tabRefs.delete(scriptId);
        }

        cloud?.tabReleased(scriptId);

        return Promise.resolve();
    };

    const flush: SyncEngine['flush'] = async (scriptId, stateVector) => {
        const entry = await getEntry(scriptId);

        if (stateVector) {
            await waitForStateVector(entry.body, stateVector, flushTimeoutMs, () => log('flush timed out waiting for replica updates'));
        }

        await writeAll(entry);
    };

    const applyRecords: SyncEngine['applyRecords'] = async (scriptId, kind, changes) => {
        const entry = await getEntry(scriptId);

        if (!isWritable(entry)) {
            log(`ignored record changes of read-only script ${scriptId}`);

            return;
        }

        const touched = applyRecordChanges(entry.records[kind], changes, RECORDS_ORIGIN);

        /*
         * The projection already holds the local values; re-write touched rows
         * from Y anyway, in case a concurrent remote edit won a field.
         */
        for (const [collection, ids] of Object.entries(touched)) {
            entry.forced[kind][collection] = {
                ...entry.forced[kind][collection],
                ...Object.fromEntries(ids.map(id => [id, null])),
            };
        }

        await entry.lanes[kind].write({force: true});
    };

    const scriptReplaced: SyncEngine['scriptReplaced'] = async scriptId => {
        const existed = entries.has(scriptId);
        const entry = await getEntry(scriptId);

        // A fresh seed already reads the rewritten projection.
        if (!existed && entry.seededOnOpen) {
            return;
        }

        const stored = await store.loadDocument(scriptId);

        // Replace as Y ops on top of the history, never a reset (invariant 8).
        replaceBodyContent(entry.body, prepareSeedDocument(stored), REPLACE_ORIGIN);

        for (const kind of RECORD_KINDS) {
            const doc = entry.records[kind];

            replaceRecords(doc, await store.loadRecords(scriptId, kind), RECORD_COLLECTIONS[kind], REPLACE_ORIGIN);
            entry.projected[kind] = readRecords(doc, RECORD_COLLECTIONS[kind]);
        }

        await entry.lanes.body.write({force: true});
    };

    /** Disposes the script's docs and deletes its stored Y state (projection untouched). */
    const dropLocalState = async (scriptId: string) => {
        const entry = entries.get(scriptId);

        entries.delete(scriptId);

        if (entry) {
            const resolved = await entry;

            Object.values(resolved.lanes).forEach(lane => lane.cancel());
            await resolved.queue.idle();
            await resolved.dispose();
        }

        await Promise.all([
            bodyDocName,
            metaDocName,
            commentsDocName,
        ].map(name => persistence.clear(name(scriptId))));
    };

    const scriptDeleted: SyncEngine['scriptDeleted'] = async scriptId => {
        await cloud?.scriptDeleted(scriptId);
        await dropLocalState(scriptId);
    };

    /** Drops a script's docs from memory when no tab needs them (state stays in IndexedDB). */
    const unload = async (scriptId: string) => {
        const entry = entries.get(scriptId);

        if (!entry || (tabRefs.get(scriptId) ?? 0) > 0) {
            return;
        }

        entries.delete(scriptId);

        const resolved = await entry;

        await writeAll(resolved);
        await resolved.dispose();
    };

    cloud = cloudConfig
        ? createEngineCloud({
            config: cloudConfig,
            log,
            getDocs: async (scriptId, seed) => {
                const entry = await getEntry(scriptId, {seed});

                return {
                    body: entry.body,
                    meta: entry.records.meta,
                    comments: entry.records.comments,
                };
            },
            flush: async scriptId => {
                const entry = entries.get(scriptId);

                if (entry) {
                    await writeAll(await entry);
                }
            },
            unload,
            dropLocalState,
            tabRefs,
            post: message => channel.postMessage(message),
        })
        : null;

    const cloudAction = (action: CloudAction) => runCloudAction(cloud, action);

    const server = serveEngineRequests(channel, {
        open: openFromTab,
        flush,
        applyRecords,
        scriptReplaced,
        scriptDeleted,
        release,
        cloud: cloudAction,
        cloudApply: async resolutions => {
            await cloud?.apply(resolutions);
        },
    }, log);

    channel.postMessage({type: 'engine-started', engineId});
    void cloud?.start().catch(error => log('cloud sync could not start', error));

    const stop: SyncEngine['stop'] = async () => {
        await cloud?.stop();
        server.stop();
        channel.close();

        const all = await Promise.allSettled(entries.values());

        entries.clear();

        for (const result of all) {
            if (result.status === 'fulfilled') {
                await writeAll(result.value);
                await result.value.dispose();
            }
        }
    };

    return {
        engineId,
        open,
        flush,
        applyRecords,
        scriptReplaced,
        scriptDeleted,
        stop,
    };
};
