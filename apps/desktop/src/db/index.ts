import {createPgliteBootstrap} from '@stagistic/db/pglite';
import {uuidv7} from '@stagistic/shared';

/*
 * Live store lives in IndexedDB (OPFS is unreliable in macOS WKWebView —
 * `createSyncAccessHandle` fails with "Invalid platform file handle"). Eviction
 * is guarded with navigator.storage.persist() (see requestPersistentStorage),
 * and portable snapshots are written into the app data folder (see ./backups.ts).
 */
const DATA_DIR = 'idb://stagistic-main';

const bootstrap = createPgliteBootstrap({
    dataDir: DATA_DIR,
    /*
     * fsBundleUrl/wasmUrl are unused on the worker path (the worker fetches the
     * pglite assets itself) but the option shape still requires them.
     */
    fsBundleUrl: '',
    wasmUrl: '',
    workerFactory: () => new Worker(new URL('./pglite.worker.ts', import.meta.url), {type: 'module'}),
});

export const getLocalDb = bootstrap.getLocalDb;

/*
 * Private in-memory database for viewing a stored draft or version. The unique
 * worker id keeps other windows from sharing it through leader election.
 */
export const createSnapshotViewDb = () => createPgliteBootstrap({
    dataDir: 'memory://',
    fsBundleUrl: '',
    wasmUrl: '',
    workerId: `stagistic-snapshot-view:${uuidv7()}`,
    workerFactory: () => new Worker(new URL('./pglite.worker.ts', import.meta.url), {type: 'module'}),
}).getLocalDb();
export const syncToFs = bootstrap.syncToFs;
export const prepareLocalDbWithProgress = bootstrap.prepareLocalDbWithProgress;
export const dumpDataDir = bootstrap.dumpDataDir;

// Ask the browser to keep IndexedDB from being evicted under storage pressure.
export const requestPersistentStorage = async (): Promise<void> => {
    if (navigator.storage?.persist) {
        await navigator.storage.persist();
    }
};
