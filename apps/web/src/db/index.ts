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
});

export {
    type DbBootstrapStep,
    type DbBootstrapUpdate,
    type LocalDb,
};
export const getLocalDb = bootstrap.getLocalDb;
export const runMigrations = bootstrap.runMigrations;
export const prepareLocalDb = bootstrap.prepareLocalDb;
export const prepareLocalDbWithProgress = bootstrap.prepareLocalDbWithProgress;
