import type {DedupeRule} from '../ydoc/recordsCodec';

/*
 * Record collections of a script. `meta` lives in the meta Y.Doc (next to
 * `schemaVersion`), `comments` in its own doc (future "commenter" role). The
 * row <-> record mapping lives in `@stagistic/db` (`repo/records`).
 */

export type RecordsKind = 'meta' | 'comments';

export const RECORD_COLLECTIONS: Record<RecordsKind, readonly string[]> = {
    meta: [
        'script',
        'characters',
        'genders',
        'locations',
        'scenes',
        'music',
        'attachments',
        'musicAttachments',
        'settings',
        'titlePage',
    ],
    comments: ['threads', 'messages'],
};

export const RECORD_KINDS: readonly RecordsKind[] = ['meta', 'comments'];

/** Singleton record id (script title, settings, title page). */
export const SCRIPT_RECORD_ID = 'script';

/** Collections whose projection rows hang off body-derived rows (scenes by heading block). */
export const BODY_DEPENDENT_COLLECTIONS: readonly string[] = ['scenes'];

const stringKey = (value: unknown) => (typeof value === 'string' && value.length > 0 ? value : null);

/**
 * Keys that are unique per script in the projection. Two devices may create
 * the same one offline; the engine merges them (`dedupeRecords`).
 */
export const META_DEDUPE_RULES: readonly DedupeRule[] = [
    {
        collection: 'characters',
        keyOf: fields => {
            const key = stringKey(fields.key);

            return key === null ? null : `${String(fields.kind)}:${key}`;
        },
        references: [{collection: 'characters', field: 'memberIds'}],
    },
    {
        collection: 'genders',
        keyOf: fields => stringKey(fields.key),
    },
    {
        collection: 'locations',
        keyOf: fields => stringKey(fields.name),
        references: [
            {collection: 'scenes', field: 'locationId'},
            {collection: 'scenes', field: 'locationIds'},
        ],
    },
];
