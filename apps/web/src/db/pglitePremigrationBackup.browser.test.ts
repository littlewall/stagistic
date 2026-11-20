import {PGlite} from '@electric-sql/pglite';
import pgliteDataUrl from '@pglite-data?url';
import pgliteWasmUrl from '@pglite-wasm?url';
import {
    compiledMigrations,
    createIdbPremigrationBackupStore,
    createPgliteBootstrap,
    type DbBootstrapUpdate,
    PREMIGRATION_BACKUP_DB_NAME,
    readPremigrationBackupFile,
} from '@stagistic/db/pglite';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

/*
 * Real worker, real IndexedDB: the backup is written by the worker before the
 * pending migration runs and read back by the page, also after the worker has
 * been terminated by a failed start.
 */
const LAST_MIGRATION = compiledMigrations.at(-1);

const stopWorkers: (() => void)[] = [];

// `blocked` only says a connection is still closing; the delete stays queued, and a connection that never closes fails the hook.
const deleteBackupDb = () => new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(PREMIGRATION_BACKUP_DB_NAME);

    request.addEventListener('success', () => resolve());
    request.addEventListener('error', () => reject(request.error ?? new Error('delete failed')));
});

/** A writer's database from before the newest migration: populated, one migration pending. */
const seedExistingWriter = async (dataDir: string) => {
    const seed = await PGlite.create({dataDir});

    await seed.exec(
        'CREATE TABLE __stagistic_migrations (id text PRIMARY KEY, applied_at bigint NOT NULL, checksum text NOT NULL);',
    );

    for (const migration of compiledMigrations.slice(0, -1)) {
        await seed.exec(migration.sql);
        await seed.query(
            'INSERT INTO __stagistic_migrations (id, applied_at, checksum) VALUES ($1, $2, $3)',
            [
                migration.id,
                Date.now(),
                migration.checksum,
            ],
        );
    }

    await seed.exec('INSERT INTO scripts (id, title, created_at, updated_at) VALUES (\'script-1\', \'My play\', 1, 1);');
    await seed.close();
};

const prepare = (dataDir: string) => {
    const updates: DbBootstrapUpdate[] = [];
    const bootstrap = createPgliteBootstrap({
        fsBundleUrl: pgliteDataUrl,
        wasmUrl: pgliteWasmUrl,
        dataDir,
        workerId: `premigration-backup-test:${crypto.randomUUID()}`,
        workerFactory: () => {
            const worker = new Worker(new URL('./pglite.worker.ts', import.meta.url), {type: 'module'});

            stopWorkers.push(() => worker.terminate());

            return worker;
        },
    });

    stopWorkers.push(() => void bootstrap.close());

    return {
        bootstrap,
        updates,
        result: bootstrap.prepareLocalDbWithProgress(update => updates.push(update)),
    };
};

const newDataDir = () => `idb://premigration-backup-${crypto.randomUUID()}`;

beforeEach(deleteBackupDb);
// A worker outliving its test could still write a dump into the next one.
afterEach(async () => {
    vi.restoreAllMocks();
    stopWorkers.splice(0).forEach(stop => stop());
    await deleteBackupDb();
});

describe('backup before migrations, in the real app worker', () => {
    it('keeps a restorable dump of an existing writer, taken before the pending migration', async () => {
        expect(LAST_MIGRATION).toBeDefined();

        const dataDir = newDataDir();

        await seedExistingWriter(dataDir);

        const {updates, result} = prepare(dataDir);

        await result;

        expect(updates.find(update => update.label.includes('Backing up'))?.longRunning).toBe(true);

        const file = await readPremigrationBackupFile();

        expect(file?.fileName).toMatch(/^stagistic-before-update-\d{8}T\d{6}Z\.pgdata\.tar\.gz$/);

        const restored = await PGlite.create({loadDataDir: file?.blob});
        const scripts = await restored.query<{title: string}>('SELECT title FROM scripts');
        const ledger = await restored.query<{id: string}>('SELECT id FROM __stagistic_migrations WHERE id = $1', [LAST_MIGRATION?.id]);

        await restored.close();

        expect(scripts.rows).toEqual([{title: 'My play'}]);
        // The dump is the state before the migration, not after it.
        expect(ledger.rows).toEqual([]);
    });

    it('keeps the first dump while the same update keeps failing, as one record', async () => {
        const dataDir = newDataDir();

        await seedExistingWriter(dataDir);

        const seed = await PGlite.create({dataDir});

        await seed.exec('DROP TABLE script_scene_characters');
        await seed.close();
        await expect(prepare(dataDir).result).rejects.toMatchObject({kind: 'migration-failed'});

        const first = await readPremigrationBackupFile();

        // A later reload must not dump the same, possibly half-migrated, database again.
        await new Promise(resolve => setTimeout(resolve, 20));
        await expect(prepare(dataDir).result).rejects.toMatchObject({kind: 'migration-failed'});

        const second = await readPremigrationBackupFile();

        expect(first?.blob.size).toBeGreaterThan(0);
        expect(second?.createdAt).toBe(first?.createdAt);
        expect(second?.blob.size).toBe(first?.blob.size);

        const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
            const open = indexedDB.open(PREMIGRATION_BACKUP_DB_NAME);

            open.addEventListener('success', () => {
                const request = open.result.transaction('backup').objectStore('backup').getAllKeys();

                request.addEventListener('success', () => {
                    open.result.close();
                    resolve(request.result);
                });
                request.addEventListener('error', () => reject(request.error ?? new Error('read failed')));
            });
            open.addEventListener('error', () => reject(open.error ?? new Error('open failed')));
        });

        expect(keys).toHaveLength(1);
    });

    it('stores nothing for a new install', async () => {
        const {updates, result} = prepare(newDataDir());

        await result;

        expect(updates.some(update => update.label.includes('Backing up'))).toBe(false);
        await expect(readPremigrationBackupFile()).resolves.toBeNull();
    });

    it('leaves the dump available after the migration failed and the worker was stopped', async () => {
        const dataDir = newDataDir();

        await seedExistingWriter(dataDir);

        const seed = await PGlite.create({dataDir});

        await seed.exec('DROP TABLE script_scene_characters');
        await seed.close();

        await expect(prepare(dataDir).result).rejects.toMatchObject({
            kind: 'migration-failed',
            migrationId: LAST_MIGRATION?.id,
        });

        const file = await readPremigrationBackupFile();

        expect(file?.blob.size).toBeGreaterThan(0);
    });

    it('still migrates when the backup cannot be stored', async () => {
        const dataDir = newDataDir();

        await seedExistingWriter(dataDir);

        // A connection at a higher version makes the worker's open of the backup database fail.
        const blocker = await new Promise<IDBDatabase>((resolve, reject) => {
            const open = indexedDB.open(PREMIGRATION_BACKUP_DB_NAME, 99);

            open.addEventListener('success', () => resolve(open.result));
            open.addEventListener('error', () => reject(open.error ?? new Error('open failed')));
        });

        const {bootstrap, result} = prepare(dataDir);

        try {
            await result;
        } finally {
            blocker.close();
        }

        // Asked through the running worker: a second client on the same IndexedDB would race its writes.
        const db = await bootstrap.getLocalDb();
        const {$client: client} = db as unknown as {$client: PGlite};
        const ledger = await client.query<{id: string}>(
            'SELECT id FROM __stagistic_migrations WHERE id = $1',
            [LAST_MIGRATION?.id],
        );

        expect(ledger.rows).toHaveLength(1);
    });
});

describe('IndexedDB backup store', () => {
    const backup = (createdAt: number) => ({
        createdAt,
        pgliteVersion: '0.3.15',
        targetGeneration: '1/x/0.3.15',
        firstPendingMigrationId: 'x',
        data: new Uint8Array([
            1,
            2,
            3,
        ]).buffer,
    });

    it('keeps the previous dump when saving the new one fails for lack of space', async () => {
        const store = createIdbPremigrationBackupStore();

        await store.save(backup(1));
        vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
            throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        });

        await expect(store.save(backup(2))).rejects.toMatchObject({name: 'QuotaExceededError'});
        vi.restoreAllMocks();
        await expect(store.load()).resolves.toMatchObject({createdAt: 1});
    });

    it('clears the stored dump', async () => {
        const store = createIdbPremigrationBackupStore();

        await store.save(backup(1));
        await store.clear();

        await expect(store.load()).resolves.toBeNull();
    });
});
