import {createPgliteBootstrap, type DbBootstrapStep, type DbBootstrapUpdate, type DbDumpCompression, type LocalDb} from '@stagistic/db/pglite';

// Live store lives in IndexedDB (OPFS is unreliable in macOS WKWebView —
// `createSyncAccessHandle` fails with "Invalid platform file handle"). Eviction
// is guarded with navigator.storage.persist() (see requestPersistentStorage),
// and portable snapshots are written into the app data folder (see ./backups.ts).
const DATA_DIR = 'idb://stagistic-main';

const bootstrap = createPgliteBootstrap({
    dataDir: DATA_DIR,
    // fsBundleUrl/wasmUrl are unused on the worker path (the worker fetches the
    // pglite assets itself) but the option shape still requires them.
    fsBundleUrl: '',
    wasmUrl: '',
    workerFactory: () => new Worker(new URL('./pglite.worker.ts', import.meta.url), {type: 'module'}),
});

export {type DbBootstrapStep, type DbBootstrapUpdate, type DbDumpCompression, type LocalDb};
export const getLocalDb = bootstrap.getLocalDb;
export const syncToFs = bootstrap.syncToFs;
export const prepareLocalDbWithProgress = bootstrap.prepareLocalDbWithProgress;
export const dumpDataDir = bootstrap.dumpDataDir;

// Ask the browser to keep IndexedDB from being evicted under storage pressure.
export const requestPersistentStorage = async (): Promise<void> => {
    if (navigator.storage?.persist) {
        await navigator.storage.persist();
    }
};
