import * as Y from 'yjs';

import {createBroadcastSync} from '../tabs/broadcastSync';
import {
    bodyDocToScriptDocument,
    isBodyDocEmpty,
    seedBodyDoc,
} from '../ydoc/bodyCodec';
import {
    getMetaMap,
    readSchemaVersion,
    resolveSchemaGate,
    SCHEMA_VERSION_KEY,
} from '../ydoc/mapCodec';
import {
    dedupeRecords,
    projectionUpserts,
    readRecords,
    replaceRecords,
} from '../ydoc/recordsCodec';
import {
    type CreateSyncEngineArgs,
    DEDUPE_ORIGIN,
    REPLACE_ORIGIN,
    type ScriptEntry,
    SEED_ORIGIN,
    SEEDED_KEY,
    SYNC_STATE_MAP,
} from './engineTypes';
import {prepareSeedDocument} from './prepareSeed';
import {createProjectionLane, createProjectionQueue} from './projectionLane';
import {
    bodyDocName,
    commentsDocName,
    docChannelName,
    metaDocName,
} from './protocol';
import {
    BODY_DEPENDENT_COLLECTIONS,
    META_DEDUPE_RULES,
    RECORD_COLLECTIONS,
    RECORD_KINDS,
    type RecordsKind,
} from './scriptRecords';

/*
 * One script's engine state: its three Y.Docs (persisted, shared with tabs on
 * per-entry channels), the one-time seed from the projection and the debounced
 * projection lanes.
 */

export interface ScriptEntryDeps {
    store: CreateSyncEngineArgs['store'],
    persistence: CreateSyncEngineArgs['persistence'],
    clientSchemaVersion: number,
    docChannelFactory: CreateSyncEngineArgs['docChannelFactory'],
    projectionDelayMs: number,
    projectionMaxDelayMs: number,
    log: (message: string, error?: unknown) => void,
    /** Any update except the seed (cloud sync schedules a background sync). */
    onLocalChange: (scriptId: string) => void,
}

export const createScriptEntryFactory = ({
    store,
    persistence,
    clientSchemaVersion,
    docChannelFactory,
    projectionDelayMs,
    projectionMaxDelayMs,
    log,
    onLocalChange,
}: ScriptEntryDeps) => {
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

    /** `seed: false` for scripts coming from the cloud: their docs must start empty. */
    const createEntry = async (scriptId: string, seed: boolean): Promise<ScriptEntry> => {
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
            channelId: crypto.randomUUID(),
            dispose: async () => {},
        } as Omit<ScriptEntry, 'lanes'> as ScriptEntry;

        entry.lanes = createLanes(entry);

        if (isBodyDocEmpty(body) && seed) {
            const document = prepareSeedDocument(await store.loadDocument(scriptId));

            meta.transact(() => {
                metaMap.set(SCHEMA_VERSION_KEY, clientSchemaVersion);
            }, SEED_ORIGIN);
            seedBodyDoc(body, document, SEED_ORIGIN);
            entry.seededOnOpen = true;
        } else if (!isBodyDocEmpty(body)) {
            const stored = readSchemaVersion(meta);

            if (stored === null || stored < clientSchemaVersion) {
                // No body migrations exist yet; future ones must be idempotent (AGENTS.md).
                meta.transact(() => metaMap.set(SCHEMA_VERSION_KEY, clientSchemaVersion), SEED_ORIGIN);
            }
        }

        for (const kind of RECORD_KINDS) {
            entry.projected[kind] = seed
                ? await seedRecords(scriptId, kind, entry.records[kind])
                : readRecords(entry.records[kind], RECORD_COLLECTIONS[kind]);
        }

        if (entry.seededOnOpen) {
            // Normalization may have changed the stored document.
            await entry.lanes.body.write({force: true});
        }

        const syncs = [
            createBroadcastSync(body, docChannelName(bodyDocName(scriptId), entry.channelId), {channelFactory: docChannelFactory}),
            createBroadcastSync(meta, docChannelName(metaDocName(scriptId), entry.channelId), {channelFactory: docChannelFactory}),
            createBroadcastSync(comments, docChannelName(commentsDocName(scriptId), entry.channelId), {channelFactory: docChannelFactory}),
        ];
        const onBodyUpdate = (_update: Uint8Array, origin: unknown) => {
            if (origin !== SEED_ORIGIN) {
                entry.lanes.body.schedule();
                onLocalChange(scriptId);
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
                onLocalChange(scriptId);
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

    return {createEntry, isWritable};
};
