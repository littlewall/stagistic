import {PGlite} from '@electric-sql/pglite';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {
    currentDbGeneration,
    formatDbGeneration,
} from './dbGeneration';
import {
    backUpBeforeMigrations,
    type PremigrationBackup,
    premigrationBackupFileName,
    type PremigrationBackupStore,
    readPremigrationBackupFile,
} from './premigrationBackup';

const clients: PGlite[] = [];

const createClient = async () => {
    const client = await PGlite.create();

    clients.push(client);

    return client;
};

afterEach(async () => {
    await Promise.all(clients.splice(0).map(client => client.close()));
});

const quotaError = () => new DOMException('The quota has been exceeded.', 'QuotaExceededError');

/** Holds one dump like the real store. `failSaves` makes the next saves fail in order. */
const createMemoryStore = () => {
    let current: PremigrationBackup | null = null;
    const failSaves: Error[] = [];
    const store: PremigrationBackupStore = {
        save: async backup => {
            await Promise.resolve();

            const failure = failSaves.shift();

            if (failure) {
                throw failure;
            }

            current = backup;
        },
        clear: async () => {
            await Promise.resolve();
            current = null;
        },
        load: async () => {
            await Promise.resolve();

            return current;
        },
    };

    return {
        store,
        failSaves,
        current: () => current,
    };
};

const backUp = (
    client: Pick<PGlite, 'dumpDataDir'>,
    store: PremigrationBackupStore,
    {
        now = 1_000,
        firstPendingId = '20261105000000_next',
        targetGeneration = '12/20261105000000_next/0.3.15',
    } = {},
) => backUpBeforeMigrations({
    client,
    store,
    pgliteVersion: '0.3.15',
    targetGeneration,
    firstPendingId,
    now: () => now,
});

// Each test runs real PGlite instances with gzip dumps (~0.5-1 s alone); slow under a full parallel run.
describe('backing up before migrations', {timeout: 20_000}, () => {
    it('stores a dump that restores the database as it was', async () => {
        const client = await createClient();
        const {store, current} = createMemoryStore();

        await client.exec('CREATE TABLE scripts (id text); INSERT INTO scripts VALUES (\'script-1\');');

        await expect(backUp(client, store)).resolves.toBe('stored');
        await client.exec('INSERT INTO scripts VALUES (\'script-2\');');

        const backup = current();

        expect(backup).toMatchObject({
            createdAt: 1_000,
            pgliteVersion: '0.3.15',
            targetGeneration: '12/20261105000000_next/0.3.15',
            firstPendingMigrationId: '20261105000000_next',
        });

        const restored = await PGlite.create({
            loadDataDir: new Blob([backup?.data ?? new ArrayBuffer(0)], {type: 'application/x-gzip'}),
        });

        clients.push(restored);

        const rows = await restored.query<{id: string}>('SELECT id FROM scripts ORDER BY id');

        expect(rows.rows).toEqual([{id: 'script-1'}]);
    });

    it('replaces the previous dump of an earlier update', async () => {
        const client = await createClient();
        const {store, current} = createMemoryStore();

        await backUp(client, store, {
            now: 1_000,
            firstPendingId: 'first',
            targetGeneration: '11/first/0.3.15',
        });
        await backUp(client, store, {
            now: 2_000,
            firstPendingId: 'second',
            targetGeneration: '12/second/0.3.15',
        });

        expect(current()).toMatchObject({createdAt: 2_000, firstPendingMigrationId: 'second'});
    });

    it('keeps the first dump while the same update keeps failing', async () => {
        const client = await createClient();
        const {store, current} = createMemoryStore();

        await client.exec('CREATE TABLE scripts (id text); INSERT INTO scripts VALUES (\'script-1\');');
        await backUp(client, store, {now: 1_000, firstPendingId: 'first'});

        const first = current();

        await client.exec('INSERT INTO scripts VALUES (\'half-migrated\');');

        const dump = vi.spyOn(client, 'dumpDataDir');

        // The update failed after migration `first` committed, so a retry starts at a later one.
        await expect(backUp(client, store, {now: 2_000, firstPendingId: 'second'})).resolves.toBe('kept-first');
        await expect(backUp(client, store, {now: 3_000, firstPendingId: 'second'})).resolves.toBe('kept-first');
        expect(dump).not.toHaveBeenCalled();
        expect(current()).toBe(first);
    });

    it('dumps again when the stored dump cannot be read', async () => {
        const client = await createClient();
        const {store, current} = createMemoryStore();

        vi.spyOn(console, 'error').mockImplementation(() => {});
        await backUp(client, store, {now: 1_000});
        vi.spyOn(store, 'load').mockRejectedValueOnce(new Error('storage unavailable'));

        await expect(backUp(client, store, {now: 2_000})).resolves.toBe('stored');
        expect(current()).toMatchObject({createdAt: 2_000});
    });

    it('does not mistake a dump without a target for the current update', async () => {
        const client = await createClient();
        const {store, current} = createMemoryStore();
        const legacy = {
            createdAt: 500,
            pgliteVersion: '0.3.15',
            firstPendingMigrationId: 'old',
            data: new ArrayBuffer(0),
        } as unknown as PremigrationBackup;

        await store.save(legacy);

        await expect(backUp(client, store, {now: 2_000})).resolves.toBe('stored');
        expect(current()).toMatchObject({createdAt: 2_000});
    });

    it('drops the previous dump to make room when storage is full, then stores the new one', async () => {
        const client = await createClient();
        const {
            store,
            failSaves,
            current,
        } = createMemoryStore();

        await backUp(client, store, {now: 1_000, targetGeneration: '11/a/0.3.15'});
        failSaves.push(quotaError());

        await expect(backUp(client, store, {now: 2_000})).resolves.toBe('stored');
        expect(current()).toMatchObject({createdAt: 2_000});
    });

    it('goes on without a backup when storage stays full, and says so', async () => {
        const client = await createClient();
        const {
            store,
            failSaves,
            current,
        } = createMemoryStore();
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        await backUp(client, store, {now: 1_000, targetGeneration: '11/a/0.3.15'});
        failSaves.push(quotaError(), quotaError());

        await expect(backUp(client, store, {now: 2_000})).resolves.toBe('not-stored');
        expect(error).toHaveBeenCalledWith(expect.stringContaining('not stored'), expect.anything());
        // The old dump was dropped to make room, so nothing stale is offered as the latest.
        expect(current()).toBeNull();
    });

    it('keeps the previous dump when saving fails for a reason other than space', async () => {
        const client = await createClient();
        const {
            store,
            failSaves,
            current,
        } = createMemoryStore();

        vi.spyOn(console, 'error').mockImplementation(() => {});
        await backUp(client, store, {now: 1_000, targetGeneration: '11/a/0.3.15'});
        failSaves.push(new Error('database closed'));

        await expect(backUp(client, store, {now: 2_000})).resolves.toBe('not-stored');
        expect(current()).toMatchObject({createdAt: 1_000});
    });

    it('goes on without a backup when the dump cannot be made', async () => {
        const {store, current} = createMemoryStore();

        vi.spyOn(console, 'error').mockImplementation(() => {});

        const dumpFails = {dumpDataDir: () => Promise.reject(new Error('out of memory'))};

        await expect(backUp(dumpFails, store)).resolves.toBe('not-stored');
        expect(current()).toBeNull();
    });
});

describe('reading the backup back', {timeout: 20_000}, () => {
    it('offers the stored dump as a named file', async () => {
        const client = await createClient();
        const {store} = createMemoryStore();

        await backUp(client, store, {now: Date.UTC(2026, 10, 5, 12, 3, 9), targetGeneration: formatDbGeneration(currentDbGeneration)});

        const file = await readPremigrationBackupFile(store);

        expect(file?.fileName).toBe('stagistic-before-update-20261105T120309Z.pgdata.tar.gz');
        expect(file?.createdAt).toBe(Date.UTC(2026, 10, 5, 12, 3, 9));
        expect(file?.blob.size).toBeGreaterThan(0);
    });

    it('does not offer a dump taken for another update as taken before this one', async () => {
        const client = await createClient();
        const {store} = createMemoryStore();

        await backUp(client, store, {targetGeneration: '1/20200101000000_old/0.0.1'});

        await expect(readPremigrationBackupFile(store)).resolves.toBeNull();
    });

    it('offers nothing when no dump exists or the store cannot be read', async () => {
        const {store} = createMemoryStore();

        vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(readPremigrationBackupFile(store)).resolves.toBeNull();
        await expect(readPremigrationBackupFile({
            ...store,
            load: () => Promise.reject(new Error('blocked')),
        })).resolves.toBeNull();
    });

    it('names files by UTC time so they sort', () => {
        expect(premigrationBackupFileName(Date.UTC(2026, 10, 5, 12, 3, 9)))
            .toBe('stagistic-before-update-20261105T120309Z.pgdata.tar.gz');
    });
});
