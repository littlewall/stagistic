import * as Y from 'yjs';

/*
 * Keyed records (characters, locations, settings, comment threads …) in a
 * Y.Doc. Each collection is a root Y.Map of `id -> Y.Map(field -> JSON value)`.
 * Fields are last-writer-wins; deleting a record wins over concurrent edits.
 *
 * Local edits arrive as `RecordChanges` (before/after per record, computed from
 * the projection around a repository mutation) and are applied three-way: a
 * field is written only where the doc still holds `before`, so concurrent
 * remote edits of other fields (or of the same field) are never reverted.
 */

export type RecordFields = Record<string, unknown>;
/** collection -> record id -> fields */
export type RecordsSnapshot = Record<string, Record<string, RecordFields>>;

export interface RecordChange {
    before: RecordFields | null,
    after: RecordFields | null,
}

export type RecordChanges = Record<string, Record<string, RecordChange>>;
/** collection -> record id -> current fields (`null` = deleted) */
export type RecordUpserts = Record<string, Record<string, RecordFields | null>>;

const stableStringify = (value: unknown): string => {
    if (value === undefined) {
        return 'undefined';
    }

    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));

    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
};

export const recordValuesEqual = (left: unknown, right: unknown) => stableStringify(left) === stableStringify(right);

const getCollection = (doc: Y.Doc, collection: string) => doc.getMap<Y.Map<unknown>>(collection);

const readFields = (record: Y.Map<unknown>): RecordFields => {
    const fields: RecordFields = {};

    record.forEach((value, key) => {
        fields[key] = value;
    });

    return fields;
};

export const readRecord = (doc: Y.Doc, collection: string, id: string): RecordFields | null => {
    const record = getCollection(doc, collection).get(id);

    return record instanceof Y.Map ? readFields(record) : null;
};

export const readRecords = (doc: Y.Doc, collections: readonly string[]): RecordsSnapshot => {
    const snapshot: RecordsSnapshot = {};

    for (const collection of collections) {
        const records: Record<string, RecordFields> = {};

        getCollection(doc, collection).forEach((record, id) => {
            if (record instanceof Y.Map) {
                records[id] = readFields(record);
            }
        });
        snapshot[collection] = records;
    }

    return snapshot;
};

const createRecord = (fields: RecordFields) => {
    const record = new Y.Map<unknown>();

    for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
            record.set(key, value);
        }
    }

    return record;
};

const setField = (record: Y.Map<unknown>, key: string, value: unknown) => {
    if (value === undefined) {
        record.delete(key);
    } else if (!recordValuesEqual(record.get(key), value)) {
        record.set(key, value);
    }
};

/** Records whose fields differ between two snapshots (both sides kept whole). */
export const diffRecords = (before: RecordsSnapshot, after: RecordsSnapshot): RecordChanges => {
    const changes: RecordChanges = {};
    const collections = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const collection of collections) {
        const beforeRecords = before[collection] ?? {};
        const afterRecords = after[collection] ?? {};
        const ids = new Set([...Object.keys(beforeRecords), ...Object.keys(afterRecords)]);

        for (const id of ids) {
            const previous = beforeRecords[id] ?? null;
            const next = afterRecords[id] ?? null;

            if (!recordValuesEqual(previous, next)) {
                changes[collection] ??= {};
                changes[collection][id] = {before: previous, after: next};
            }
        }
    }

    return changes;
};

export const isEmptyChanges = (changes: Record<string, Record<string, unknown>>) => Object.values(changes).every(records => Object.keys(records).length === 0);

/**
 * Applies local changes three-way (see file comment). Returns the touched
 * record ids per collection so the caller can re-project exactly those.
 */
export const applyRecordChanges = (doc: Y.Doc, changes: RecordChanges, origin: unknown = null) => {
    const touched: Record<string, string[]> = {};

    doc.transact(() => {
        for (const [collection, records] of Object.entries(changes)) {
            const map = getCollection(doc, collection);

            touched[collection] = Object.keys(records);

            for (const [id, {before, after}] of Object.entries(records)) {
                const current = map.get(id);

                if (after === null) {
                    map.delete(id);
                    continue;
                }

                if (!(current instanceof Y.Map)) {
                    // Deleted concurrently (delete wins) unless this is a creation.
                    if (before === null) {
                        map.set(id, createRecord(after));
                    }

                    continue;
                }

                const previous = before ?? {};
                const keys = new Set([...Object.keys(previous), ...Object.keys(after)]);

                for (const key of keys) {
                    const unchangedLocally = recordValuesEqual(previous[key], after[key]);
                    const untouchedRemotely = recordValuesEqual(current.get(key), previous[key]);

                    if (!unchangedLocally && (untouchedRemotely || before === null)) {
                        setField(current, key, after[key]);
                    }
                }
            }
        }
    }, origin);

    return touched;
};

/**
 * Makes the given collections equal `snapshot` with ordinary Y ops (seed,
 * package restore). Never resets the doc, so other replicas converge.
 */
export const replaceRecords = (doc: Y.Doc, snapshot: RecordsSnapshot, collections: readonly string[], origin: unknown = null) => {
    doc.transact(() => {
        for (const collection of collections) {
            const map = getCollection(doc, collection);
            const next = snapshot[collection] ?? {};

            for (const id of Array.from(map.keys())) {
                if (!(id in next)) {
                    map.delete(id);
                }
            }

            for (const [id, fields] of Object.entries(next)) {
                const current = map.get(id);

                if (!(current instanceof Y.Map)) {
                    map.set(id, createRecord(fields));
                    continue;
                }

                for (const key of Array.from(current.keys())) {
                    if (!(key in fields)) {
                        current.delete(key);
                    }
                }

                for (const [key, value] of Object.entries(fields)) {
                    setField(current, key, value);
                }
            }
        }
    }, origin);
};

/** Records that changed since the last projection, as their current state. */
export const projectionUpserts = (projected: RecordsSnapshot, current: RecordsSnapshot): RecordUpserts => {
    const upserts: RecordUpserts = {};

    for (const [collection, records] of Object.entries(diffRecords(projected, current))) {
        upserts[collection] = Object.fromEntries(Object.entries(records).map(([id, change]) => [id, change.after]));
    }

    return upserts;
};

export interface RecordReference {
    collection: string,
    field: string,
}

export interface DedupeRule {
    collection: string,
    /** Records sharing this value are duplicates (e.g. a character key). */
    keyOf: (fields: RecordFields) => string | null,
    /** Fields elsewhere that hold ids of this collection (string or string[]). */
    references?: readonly RecordReference[],
}

const winnerOrder = (left: [string, RecordFields], right: [string, RecordFields]) => {
    const leftCreated = typeof left[1].createdAt === 'number' ? left[1].createdAt : Number.POSITIVE_INFINITY;
    const rightCreated = typeof right[1].createdAt === 'number' ? right[1].createdAt : Number.POSITIVE_INFINITY;

    if (leftCreated !== rightCreated) {
        return leftCreated - rightCreated;
    }

    return left[0] < right[0] ? -1 : 1;
};

const remapReference = (value: unknown, mapping: Map<string, string>) => {
    if (typeof value === 'string') {
        return mapping.get(value) ?? value;
    }

    if (Array.isArray(value)) {
        const ids = (value as unknown[]).filter((item): item is string => typeof item === 'string');

        return [...new Set(ids.map(id => mapping.get(id) ?? id))].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
    }

    return value;
};

/**
 * Merges records that two replicas created independently with the same key
 * (two devices confirming "HAMLET"). Deterministic (oldest, then lowest id
 * wins), so replicas running it concurrently converge. The winner keeps its
 * fields and takes the loser's where it has none; references are remapped.
 */
export const dedupeRecords = (doc: Y.Doc, rules: readonly DedupeRule[], origin: unknown = null) => {
    let merged = 0;

    doc.transact(() => {
        for (const rule of rules) {
            const map = getCollection(doc, rule.collection);
            const groups = new Map<string, Array<[string, RecordFields]>>();

            map.forEach((record, id) => {
                if (!(record instanceof Y.Map)) {
                    return;
                }

                const fields = readFields(record);
                const key = rule.keyOf(fields);

                if (key !== null) {
                    groups.set(key, [...groups.get(key) ?? [], [id, fields]]);
                }
            });

            const mapping = new Map<string, string>();

            for (const group of groups.values()) {
                if (group.length < 2) {
                    continue;
                }

                const [[winnerId, winnerFields], ...losers] = [...group].sort(winnerOrder);
                const winner = map.get(winnerId)!;

                for (const [loserId, loserFields] of losers) {
                    for (const [key, value] of Object.entries(loserFields)) {
                        if ((winnerFields[key] === null || winnerFields[key] === undefined) && value !== null && value !== undefined) {
                            winner.set(key, value);
                            winnerFields[key] = value;
                        }
                    }

                    map.delete(loserId);
                    mapping.set(loserId, winnerId);
                    merged++;
                }
            }

            if (mapping.size === 0) {
                continue;
            }

            for (const reference of rule.references ?? []) {
                getCollection(doc, reference.collection).forEach(record => {
                    if (record instanceof Y.Map && record.has(reference.field)) {
                        setField(record, reference.field, remapReference(record.get(reference.field), mapping));
                    }
                });
            }
        }
    }, origin);

    return merged;
};
