import pgliteDataUrl from '@pglite-data?url';
import pgliteWasmUrl from '@pglite-wasm?url';
import {
    createPgliteBootstrap,
    type DbBootstrapStep,
    type DbBootstrapUpdate,
    type LocalDb,
} from '@stagistic/db/pglite';

const bootstrap = createPgliteBootstrap({

    fsBundleUrl: pgliteDataUrl,
    wasmUrl: pgliteWasmUrl,
    dataDir: 'idb://stagistic-main',
    workerFactory: () => new Worker(
        new URL('./pglite.worker.ts', import.meta.url),
        {type: 'module'},
    ),
});

export {
    type DbBootstrapStep,
    type DbBootstrapUpdate,
    type LocalDb,
};
export const getLocalDb = bootstrap.getLocalDb;
export const syncToFs = bootstrap.syncToFs;
export const prepareLocalDbWithProgress = bootstrap.prepareLocalDbWithProgress;
