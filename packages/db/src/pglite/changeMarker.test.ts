import {PGlite} from '@electric-sql/pglite';
import {drizzle} from 'drizzle-orm/pglite';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {readDataChangeMarker} from './changeMarker';

describe('readDataChangeMarker', {timeout: 20_000}, () => {
    it('stays put for reads, flushes and dumps and moves for writes', async () => {
        const client = await PGlite.create();
        const db = drizzle({client});

        await client.exec('CREATE TABLE t (v int)');

        const before = await readDataChangeMarker(db);

        await client.query('SELECT * FROM t');
        await client.syncToFs();
        await client.dumpDataDir('gzip');
        expect(await readDataChangeMarker(db)).toBe(before);

        await client.exec('INSERT INTO t VALUES (1)');
        expect(await readDataChangeMarker(db)).not.toBe(before);

        await client.close();
    });
});
