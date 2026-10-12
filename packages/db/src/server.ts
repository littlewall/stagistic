/*
 * Server entry (`@stagistic/db/server`): what the collab server needs to keep
 * a Postgres projection of script records, without PGlite or browser code.
 */
import type {
    RecordsKind,
    RecordsSnapshot,
    RecordUpserts,
} from '@stagistic/sync-engine';

import type {DbClient} from './queries';
import {readScriptRecords} from './repo/records/readScriptRecords';
import {writeScriptRecords} from './repo/records/writeScriptRecords';

export {compiledMigrations as PROJECTION_MIGRATIONS} from './pglite/migrations.compiled';
export type {DbClient} from './queries';
export {readScriptRecords} from './repo/records/readScriptRecords';
export {writeScriptRecords} from './repo/records/writeScriptRecords';
export {dbSchema} from './schema';

/**
 * Makes the projected rows of one kind equal `snapshot` (the Y.Doc's records):
 * changed records are upserted, records missing from it deleted. Returns
 * whether anything changed.
 */
export const syncScriptRecords = async (tx: DbClient, scriptId: string, kind: RecordsKind, snapshot: RecordsSnapshot, now = Date.now()) => {
    const current = await readScriptRecords(tx, scriptId, kind);
    const upserts: RecordUpserts = {};

    for (const collection of new Set([...Object.keys(current), ...Object.keys(snapshot)])) {
        const next = snapshot[collection] ?? {};

        upserts[collection] = {...next};

        for (const id of Object.keys(current[collection] ?? {})) {
            if (!(id in next)) {
                upserts[collection][id] = null;
            }
        }
    }

    return writeScriptRecords(tx, scriptId, kind, upserts, now);
};
