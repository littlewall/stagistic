import pgliteDataUrl from '@pglite-data?url';
import pgliteWasmUrl from '@pglite-wasm?url';
import {
    createLocalPgliteRepository,
    dbQueries,
    InMemoryFileStorage,
} from '@stagistic/db';
import {createPgliteBootstrap} from '@stagistic/db/pglite';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

/*
 * A browser tab that closes kills its database worker mid-flight. The test
 * stands in for that by terminating the worker right after a save resolves, then
 * opens the same IndexedDB again like a reopened tab would.
 */
const openTab = (dataDir: string) => {
    const workers: Worker[] = [];
    const bootstrap = createPgliteBootstrap({
        fsBundleUrl: pgliteDataUrl,
        wasmUrl: pgliteWasmUrl,
        dataDir,
        workerId: `durability-test:${crypto.randomUUID()}`,
        workerFactory: () => {
            const worker = new Worker(new URL('./pglite.worker.ts', import.meta.url), {type: 'module'});

            workers.push(worker);

            return worker;
        },
    });
    const repository = createLocalPgliteRepository({
        getLocalDb: bootstrap.getLocalDb,
        syncToFs: bootstrap.syncToFs,
        fileStorage: new InMemoryFileStorage(),
    });

    return {
        repository,
        getLocalDb: bootstrap.getLocalDb,
        syncToFs: bootstrap.syncToFs,
        close: () => workers.forEach(worker => worker.terminate()),
    };
};

const documentWithText = (text: string) => ({
    type: 'doc' as const,
    content: [
        {
            type: 'stageDirection' as const,
            attrs: {id: 'block-1'},
            content: [{type: 'text' as const, text}],
        },
    ],
});

const deleteIndexedDb = (dataDir: string) => new Promise<void>(resolve => {
    const request = indexedDB.deleteDatabase(`/pglite/${dataDir.replace('idb://', '')}`);

    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
});

describe('database write durability', () => {
    it('keeps a saved document when the tab closes right after the save resolves', async () => {
        const dataDir = `idb://stagistic-durability-${crypto.randomUUID()}`;
        const scriptId = `durable-${crypto.randomUUID()}`;
        const text = `Saved just before the tab closed ${crypto.randomUUID()}`;
        const first = openTab(dataDir);

        try {
            await first.repository.createScriptWithId({id: scriptId, title: 'Durability'});
            await first.repository.saveLatest(scriptId, documentWithText(text));
            first.close();

            const second = openTab(dataDir);

            try {
                const loaded = await second.repository.loadLatest(scriptId);

                expect(JSON.stringify(loaded)).toContain(text);
            } finally {
                second.close();
            }
        } finally {
            first.close();
            await deleteIndexedDb(dataDir);
        }
    });

    it('resolves syncToFs only once earlier writes are in IndexedDB', async () => {
        const dataDir = `idb://stagistic-durability-${crypto.randomUUID()}`;
        const scriptId = `durable-sync-${crypto.randomUUID()}`;
        const first = openTab(dataDir);

        try {
            const db = await first.getLocalDb();

            // A flush right after startup, before any query, is rejected as "leader changed".
            await dbQueries.insertScript(db, {
                id: `warm-${scriptId}`,
                title: 'Warm',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            await first.syncToFs();
            await dbQueries.insertScript(db, {
                id: scriptId,
                title: 'Durable sync',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            await first.syncToFs();
            first.close();

            const second = openTab(dataDir);

            try {
                const scripts = await second.repository.listScripts();

                expect(scripts.map(script => script.id)).toContain(scriptId);
            } finally {
                second.close();
            }
        } finally {
            first.close();
            await deleteIndexedDb(dataDir);
        }
    });

    it('stores a write by the time its own query resolves, also after many read-only queries', async () => {
        const dataDir = `idb://stagistic-durability-${crypto.randomUUID()}`;
        const scriptId = `durable-query-${crypto.randomUUID()}`;
        const first = openTab(dataDir);

        try {
            const db = await first.getLocalDb();

            await dbQueries.insertScript(db, {
                id: `warm-${scriptId}`,
                title: 'Warm',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            await first.syncToFs();

            // Reads must not leave the next write looking already stored.
            for (let index = 0; index < 5; index += 1) {
                await first.repository.listScripts();
                await first.syncToFs();
            }

            // No explicit syncToFs: the query's own trailing flush is what stores it.
            await dbQueries.insertScript(db, {
                id: scriptId,
                title: 'Stored by its own query',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            first.close();

            const second = openTab(dataDir);

            try {
                const scripts = await second.repository.listScripts();

                expect(scripts.map(script => script.id)).toContain(scriptId);
            } finally {
                second.close();
            }
        } finally {
            first.close();
            await deleteIndexedDb(dataDir);
        }
    });
});
