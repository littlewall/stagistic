import type {ScriptDocument} from '@stagistic/script';

import type {ProjectionStore} from '../engine/engineTypes';
import type {RecordsKind} from '../engine/scriptRecords';
import type {RecordsSnapshot, RecordUpserts} from '../ydoc/recordsCodec';

/** In-memory projection (stands in for PGlite) for engine tests. */
export const createMemoryProjectionStore = (initial: Record<string, ScriptDocument> = {}) => {
    const documents = new Map(Object.entries(initial));
    const documentWrites: Array<{scriptId: string, document: ScriptDocument}> = [];
    const records = new Map<string, RecordsSnapshot>();
    const recordWrites: Array<{
        scriptId: string,
        kind: RecordsKind,
        upserts: RecordUpserts,
    }> = [];
    const keyOf = (scriptId: string, kind: RecordsKind) => `${scriptId}:${kind}`;

    /** Current projected records (a copy). */
    const readRecordsOf = (scriptId: string, kind: RecordsKind): RecordsSnapshot => structuredClone(records.get(keyOf(scriptId, kind)) ?? {});

    const store: ProjectionStore = {
        loadDocument: scriptId => Promise.resolve(documents.get(scriptId) ?? null),
        writeDocument: (scriptId, document) => {
            documents.set(scriptId, document);
            documentWrites.push({scriptId, document});

            return Promise.resolve();
        },
        loadRecords: (scriptId, kind) => Promise.resolve(readRecordsOf(scriptId, kind)),
        writeRecords: (scriptId, kind, upserts) => {
            const snapshot = readRecordsOf(scriptId, kind);

            for (const [collection, items] of Object.entries(upserts)) {
                snapshot[collection] ??= {};

                for (const [id, fields] of Object.entries(items)) {
                    if (fields === null) {
                        delete snapshot[collection][id];
                    } else {
                        snapshot[collection][id] = structuredClone(fields);
                    }
                }
            }

            records.set(keyOf(scriptId, kind), snapshot);
            recordWrites.push({
                scriptId,
                kind,
                upserts,
            });

            return Promise.resolve();
        },
    };

    return {
        store,
        documents,
        documentWrites,
        recordWrites,
        readRecordsOf,
        setRecords: (scriptId: string, kind: RecordsKind, snapshot: RecordsSnapshot) => records.set(keyOf(scriptId, kind), structuredClone(snapshot)),
    };
};
