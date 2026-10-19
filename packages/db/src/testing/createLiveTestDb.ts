import {PGlite} from '@electric-sql/pglite';
import {live, type PGliteWithLive} from '@electric-sql/pglite/live';
import {drizzle} from 'drizzle-orm/pglite';

import {dbSchema} from '../schema';
import {loadMigratedDataDir, type TestDb} from './createTestDb';

export const createLiveTestDb = async (): Promise<{
    db: TestDb,
    client: PGliteWithLive,
}> => {
    const client = await PGlite.create({extensions: {live}, loadDataDir: await loadMigratedDataDir()});

    const db = drizzle({client, schema: dbSchema});

    return {db, client};
};
