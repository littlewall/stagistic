import {sql} from 'drizzle-orm';

import type {LocalDb} from './bootstrapTypes';

/*
 * A value that changes whenever the database is written and stays the same
 * while it is only read, flushed or dumped: the end of the write-ahead log.
 * Backups compare it instead of the dump, because gzip output differs for
 * identical data. A rolled-back write also moves it, which only costs a
 * backup that was not needed. An explicit CHECKPOINT moves it too; the app
 * never issues one.
 */
export const readDataChangeMarker = async (db: Pick<LocalDb, 'execute'>): Promise<string> => {
    const result = await db.execute<{marker: string}>(sql`SELECT pg_current_wal_insert_lsn()::text AS marker`);

    return result.rows[0].marker;
};
