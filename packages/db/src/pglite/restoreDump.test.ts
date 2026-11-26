import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {PGlite} from '@electric-sql/pglite';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {compiledMigrations} from './migrations.compiled';
import {replaceDataDirWithDump, validateDump} from './restoreDump';

const dumpOf = async (value: string, migrationId: string = compiledMigrations[0].id) => {
    const client = await PGlite.create();

    await client.exec(`CREATE TABLE t (v text); INSERT INTO t VALUES ('${value}');`);
    await client.exec('CREATE TABLE __stagistic_migrations (id text PRIMARY KEY, applied_at bigint NOT NULL, checksum text);');
    await client.exec(`INSERT INTO __stagistic_migrations VALUES ('${migrationId}', 1, null);`);

    const dump = await client.dumpDataDir('gzip');

    await client.close();

    return dump;
};

// Each case starts several PGlite instances; under the full parallel suite that exceeds the 5 s default.
describe('validateDump', {timeout: 20_000}, () => {
    it('accepts a real dump', async () => {
        await expect(validateDump(await dumpOf('a'))).resolves.toBeUndefined();
    });

    it('rejects a backup from a newer version', async () => {
        await expect(validateDump(await dumpOf('a', '99999999999999_future'))).rejects.toThrow('newer version');
    });

    it('accepts a backup that applied a since-renamed migration id', async () => {
        await expect(validateDump(await dumpOf('a', '0027_scene_board_metadata'))).resolves.toBeUndefined();
    });

    it('rejects an unreadable file', async () => {
        await expect(validateDump(new Blob(['not a dump']))).rejects.toThrow();
    });
});

describe('replaceDataDirWithDump', {timeout: 20_000}, () => {
    it('replaces the existing data with the dump', async () => {
        const dataDir = join(await mkdtemp(join(tmpdir(), 'restore-')), 'db');
        const live = await PGlite.create(dataDir);

        await live.exec('CREATE TABLE t (v text); INSERT INTO t VALUES (\'live\');');
        await live.close();

        await replaceDataDirWithDump({
            dataDir,
            dump: await dumpOf('backup'),
            emptyStore: path => rm(path, {recursive: true, force: true}),
        });

        const restored = await PGlite.create(dataDir);
        const rows = await restored.query<{v: string}>('SELECT v FROM t');

        await restored.close();
        await rm(dataDir, {recursive: true, force: true});

        expect(rows.rows.map(row => row.v)).toEqual(['backup']);
    });
});
