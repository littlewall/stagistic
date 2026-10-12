import * as Y from 'yjs';

import {createBroadcastSync} from '../tabs/broadcastSync';
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
import {
    applyRecordChanges,
    dedupeRecords,
    projectionUpserts,
    readRecords,
    replaceRecords,
} from '../ydoc/recordsCodec';
import {
    type CreateSyncEngineArgs,
    DEDUPE_ORIGIN,
    RECORDS_ORIGIN,
    REPLACE_ORIGIN,
    type ScriptEntry,
    SEED_ORIGIN,
    SEEDED_KEY,
    SYNC_STATE_MAP,
    type SyncEngine,
} from './engineTypes';
import {prepareSeedDocument} from './prepareSeed';
import {createProjectionLane, createProjectionQueue} from './projectionLane';
import {
    bodyDocName,
    commentsDocName,
    createControlChannel,
    metaDocName,
} from './protocol';
import {
    BODY_DEPENDENT_COLLECTIONS,
    META_DEDUPE_RULES,
    RECORD_COLLECTIONS,
    RECORD_KINDS,
    type RecordsKind,
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
}: CreateSyncEngineArgs): SyncEngine => {
    const engineId = crypto.randomUUID();
    const entries = new Map<string, Promise<ScriptEntry>>();
    const channel = controlChannelFactory();

    // An older engine must not project content it does not understand.
    const isWritable = (entry: ScriptEntry) => resolveSchemaGate(readSchemaVersion(entry.records.meta), clientSchemaVersion) === 'writable';

    const projectRecords = async (entry: ScriptEntry, kind: RecordsKind) => {
        const current = readRecords(entry.records[kind], RECORD_COLLECTIONS[kind]);
        const upserts = projectionUpserts(entry.projected[kind], current);

        for (const [collection, ids] of Object.entries(entry.forced[kind])) {
            for (const id of Object.keys(ids)) {
                upserts[collection] ??= {};
                upserts[collection][id] = current[collection]?.[id] ?? null;
            }
        }

        entry.projected[kind] = current;
        entry.forced[kind] = {};

        if (Object.values(upserts).some(records => Object.keys(records).length > 0)) {
            await store.writeRecords(entry.scriptId, kind, upserts);
        }
    };

    const projectBody = async (entry: ScriptEntry) => {
        await store.writeDocument(entry.scriptId, bodyDocToScriptDocument(entry.body));

        // Rows like scene metadata attach to body-derived rows: re-apply them.
        const current = readRecords(entry.records.meta, BODY_DEPENDENT_COLLECTIONS);

        await store.writeRecords(entry.scriptId, 'meta', current);
    };

    const createLanes = (entry: ScriptEntry): ScriptEntry['lanes'] => {
        const lane = (project: () => Promise<void>) => createProjectionLane({
            queue: entry.queue,
            project: async () => {
                if (isWritable(entry)) {
                    await project();
                }
            },
            delayMs: projectionDelayMs,
            maxDelayMs: projectionMaxDelayMs,
        });

        return {
            body: lane(() => projectBody(entry)),
            meta: lane(() => projectRecords(entry, 'meta')),
            comments: lane(() => projectRecords(entry, 'comments')),
        };
    };

    const seedRecords = async (scriptId: string, kind: RecordsKind, doc: Y.Doc) => {
        const state = doc.getMap<unknown>(SYNC_STATE_MAP);

        if (state.get(SEEDED_KEY) !== true) {
            const snapshot = await store.loadRecords(scriptId, kind);

            doc.transact(() => {
                replaceRecords(doc, snapshot, RECORD_COLLECTIONS[kind]);
                state.set(SEEDED_KEY, true);
            }, SEED_ORIGIN);
        }

        return readRecords(doc, RECORD_COLLECTIONS[kind]);
    };

    const createEntry = async (scriptId: string): Promise<ScriptEntry> => {
        const body = new Y.Doc({gc: true});
        const meta = new Y.Doc({gc: true});
        const comments = new Y.Doc({gc: true});
        const stores = await Promise.all([
            persistence.bind(bodyDocName(scriptId), body),
            persistence.bind(metaDocName(scriptId), meta),
            persistence.bind(commentsDocName(scriptId), comments),
        ]);
        const metaMap = getMetaMap(meta);
        const entry = {
            scriptId,
            body,
            records: {meta, comments},
            projected: {meta: {}, comments: {}},
            forced: {meta: {}, comments: {}},
            queue: createProjectionQueue(log, scriptId),
            seededOnOpen: false,
            dispose: async () => {},
        } as Omit<ScriptEntry, 'lanes'> as ScriptEntry;

        entry.lanes = createLanes(entry);

        if (isBodyDocEmpty(body)) {
            const seed = prepareSeedDocument(await store.loadDocument(scriptId));

            meta.transact(() => {
                metaMap.set(SCHEMA_VERSION_KEY, clientSchemaVersion);
            }, SEED_ORIGIN);
            seedBodyDoc(body, seed, SEED_ORIGIN);
            entry.seededOnOpen = true;
        } else {
            const stored = readSchemaVersion(meta);

            if (stored === null || stored < clientSchemaVersion) {
                // No body migrations exist yet; future ones must be idempotent (AGENTS.md).
                meta.transact(() => metaMap.set(SCHEMA_VERSION_KEY, clientSchemaVersion), SEED_ORIGIN);
            }
        }

        for (const kind of RECORD_KINDS) {
            entry.projected[kind] = await seedRecords(scriptId, kind, entry.records[kind]);
        }

        if (entry.seededOnOpen) {
            // Normalization may have changed the stored document.
            await entry.lanes.body.write({force: true});
        }

        const syncs = [
            createBroadcastSync(body, bodyDocName(scriptId), {channelFactory: docChannelFactory}),
            createBroadcastSync(meta, metaDocName(scriptId), {channelFactory: docChannelFactory}),
            createBroadcastSync(comments, commentsDocName(scriptId), {channelFactory: docChannelFactory}),
        ];
        const onBodyUpdate = (_update: Uint8Array, origin: unknown) => {
            if (origin !== SEED_ORIGIN) {
                entry.lanes.body.schedule();
            }
        };
        const recordListeners = RECORD_KINDS.map(kind => {
            const doc = entry.records[kind];
            const listener = (_update: Uint8Array, origin: unknown) => {
                if (origin === SEED_ORIGIN || origin === REPLACE_ORIGIN) {
                    return;
                }

                if (kind === 'meta' && origin !== DEDUPE_ORIGIN && isWritable(entry)) {
                    dedupeRecords(doc, META_DEDUPE_RULES, DEDUPE_ORIGIN);
                }

                entry.lanes[kind].schedule();
            };

            doc.on('update', listener);

            return () => doc.off('update', listener);
        });

        body.on('update', onBodyUpdate);

        entry.dispose = async () => {
            body.off('update', onBodyUpdate);
            recordListeners.forEach(off => off());
            syncs.forEach(sync => sync.destroy());
            await Promise.all(stores.map(item => item.destroy()));
            body.destroy();
            meta.destroy();
            comments.destroy();
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

    const writeAll = async (entry: ScriptEntry) => {
        await entry.lanes.body.write();
        await entry.lanes.meta.write();
        await entry.lanes.comments.write();
    };

    const open: SyncEngine['open'] = async scriptId => {
        const entry = await getEntry(scriptId);

        return {schemaVersion: readSchemaVersion(entry.records.meta)};
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

    const scriptDeleted: SyncEngine['scriptDeleted'] = async scriptId => {
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

    const server = serveEngineRequests(channel, {
        open,
        flush,
        applyRecords,
        scriptReplaced,
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
