import {PGlite} from '@electric-sql/pglite';
import {live, type PGliteWithLive} from '@electric-sql/pglite/live';
import {drizzle} from 'drizzle-orm/pglite';

import {runPgliteMigrations} from '../pglite/migrations';
import {dbSchema} from '../schema';
import type {TestDb} from './createTestDb';

export const createLiveTestDb = async (): Promise<{
    db: TestDb,
    client: PGliteWithLive,
}> => {
    const client = await PGlite.create({extensions: {live}});

    await runPgliteMigrations(client);

    const db = drizzle({client, schema: dbSchema});

    return {db, client};
};
