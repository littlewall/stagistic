import * as Y from 'yjs';

export const META_FIELD = 'meta';
export const COMMENTS_FIELD = 'comments';
export const SCHEMA_VERSION_KEY = 'schemaVersion';

export const getMetaMap = (doc: Y.Doc) => doc.getMap<unknown>(META_FIELD);
export const getCommentsMap = (doc: Y.Doc) => doc.getMap<unknown>(COMMENTS_FIELD);

export const mapToRecord = (map: Y.Map<unknown>): Record<string, unknown> => map.toJSON();

/**
 * Overwrites a Y.Map so it equals `record`: sets changed keys, deletes keys
 * missing from `record`. Unchanged keys are left alone (no-op ops).
 */
export const replaceMapContent = (map: Y.Map<unknown>, record: Record<string, unknown>, origin: unknown = null) => {
    const apply = () => {
        const staleKeys = Array.from(map.keys()).filter(key => !(key in record));

        for (const key of staleKeys) {
            map.delete(key);
        }

        for (const [key, value] of Object.entries(record)) {
            if (JSON.stringify(map.get(key)) !== JSON.stringify(value)) {
                map.set(key, value);
            }
        }
    };

    if (map.doc) {
        map.doc.transact(apply, origin);
    } else {
        apply();
    }
};

export const readSchemaVersion = (doc: Y.Doc): number | null => {
    const value = getMetaMap(doc).get(SCHEMA_VERSION_KEY);

    return typeof value === 'number' ? value : null;
};

export type SchemaGate = 'writable' | 'read-only';

/**
 * A client may write only docs whose `schemaVersion` it understands. Newer
 * docs open read-only so unknown nodes are never dropped by the binding.
 */
export const resolveSchemaGate = (docSchemaVersion: number | null, clientSchemaVersion: number): SchemaGate => {
    if (docSchemaVersion === null || docSchemaVersion <= clientSchemaVersion) {
        return 'writable';
    }

    return 'read-only';
};
