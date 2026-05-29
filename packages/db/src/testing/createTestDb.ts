import {PGlite} from '@electric-sql/pglite';
import {drizzle, type PgliteDatabase} from 'drizzle-orm/pglite';

import {runPgliteMigrations} from '../pglite/migrations';
import {dbSchema} from '../schema';

export type TestDb = PgliteDatabase<typeof dbSchema>;

/**
 * Ephemeral in-memory PGlite with the full migration set applied.
 * Used by node tests for SQL-level correctness (NOT IndexedDB flush).
 */
export const createTestDb = async (): Promise<{db: TestDb, client: PGlite}> => {
    const client = await PGlite.create();

    await runPgliteMigrations(client);

    const db = drizzle({client, schema: dbSchema});

    return {db, client};
};

export const seedScript = async (db: TestDb, scriptId: string): Promise<void> => {
    const now = Date.now();

    await db.insert(dbSchema.scripts).values({
        id: scriptId,
        title: 'Test',
        createdAt: now,
        updatedAt: now,
        activeBlockId: null,
    });
};
