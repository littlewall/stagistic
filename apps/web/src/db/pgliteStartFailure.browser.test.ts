import {PGlite} from '@electric-sql/pglite';
import pgliteDataUrl from '@pglite-data?url';
import pgliteWasmUrl from '@pglite-wasm?url';
import {createPgliteBootstrap, type DbBootstrapUpdate} from '@stagistic/db/pglite';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const prepare = (dataDir: string, workerFactory: () => Worker) => {
    const updates: DbBootstrapUpdate[] = [];
    const bootstrap = createPgliteBootstrap({
        fsBundleUrl: pgliteDataUrl,
        wasmUrl: pgliteWasmUrl,
        dataDir,
        workerId: `start-failure-test:${crypto.randomUUID()}`,
        workerFactory,
    });

    return {
        updates,
        result: bootstrap.prepareLocalDbWithProgress(update => updates.push(update)),
    };
};

describe('worker-backed database start failures', () => {
    it('reports a database newer than the app from inside the worker', async () => {
        const dataDir = `idb://start-failure-newer-${crypto.randomUUID()}`;
        const seed = await PGlite.create({dataDir});

        await seed.exec(
            'CREATE TABLE __stagistic_migrations (id text PRIMARY KEY, applied_at bigint NOT NULL, checksum text);'
            + 'INSERT INTO __stagistic_migrations VALUES (\'99991231235959_from_the_future\', 1, \'future\');',
        );
        await seed.close();

        const {result} = prepare(dataDir, () => new Worker(new URL('./pglite.worker.ts', import.meta.url), {type: 'module'}));

        await expect(result).rejects.toMatchObject({
            kind: 'database-newer-than-app',
            migrationId: '99991231235959_from_the_future',
        });
    });

    it('reports a worker file that cannot be loaded', async () => {
        const {result} = prepare(
            `idb://start-failure-missing-${crypto.randomUUID()}`,
            () => new Worker('/stagistic-missing-worker.js', {type: 'module'}),
        );

        await expect(result).rejects.toMatchObject({kind: 'unknown'});
    });

    it('marks the migration step as long running', async () => {
        const {updates, result} = prepare(
            `idb://start-failure-ok-${crypto.randomUUID()}`,
            () => new Worker(new URL('./pglite.worker.ts', import.meta.url), {type: 'module'}),
        );

        await result;
        expect(updates.find(update => update.step === 'migrations')?.longRunning).toBe(true);
        expect(updates.at(-1)).toMatchObject({step: 'ready', progress: 1});
    });
});
