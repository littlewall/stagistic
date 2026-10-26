import pgliteDataUrl from '@pglite-data?url';
import pgliteWasmUrl from '@pglite-wasm?url';
import {createPgliteBootstrap} from '@stagistic/db/pglite';
import {uuidv7} from '@stagistic/shared';

const bootstrap = createPgliteBootstrap({
    fsBundleUrl: pgliteDataUrl,
    wasmUrl: pgliteWasmUrl,
    dataDir: 'idb://stagistic-main',
    workerFactory: () => new Worker(new URL('./pglite.worker.ts', import.meta.url), {type: 'module'}),
});

export const getLocalDb = bootstrap.getLocalDb;
export const syncToFs = bootstrap.syncToFs;
export const prepareLocalDbWithProgress = bootstrap.prepareLocalDbWithProgress;

/*
 * Private in-memory database for viewing a stored draft or version. The unique
 * worker id keeps other tabs from sharing it through leader election.
 */
export const createSnapshotViewDb = () => createPgliteBootstrap({
    fsBundleUrl: pgliteDataUrl,
    wasmUrl: pgliteWasmUrl,
    dataDir: 'memory://',
    workerId: `stagistic-snapshot-view:${uuidv7()}`,
    workerFactory: () => new Worker(new URL('./pglite.worker.ts', import.meta.url), {type: 'module'}),
}).getLocalDb();
