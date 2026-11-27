import pgliteDataUrl from '@pglite-data?url';
import pgliteWasmUrl from '@pglite-wasm?url';
import {
    answerPremigrationDumps,
    createPgliteBootstrap,
    type DbBootstrapUpdate,
    loadPgliteFsBundle,
    loadPgliteWasmModule,
    readDataChangeMarker,
    replaceDataDirWithDump,
    validateDump,
} from '@stagistic/db/pglite';
import {uuidv7} from '@stagistic/shared';

import {writePremigrationBackup} from './backupStorage';
import {applyPendingRestore} from './pendingRestore';
import {recordRestoreResult} from './restoreNotice';
import {clearStagedRestore, readStagedRestore} from './restoreStorage';

const createDbWorker = () => {
    const worker = new Worker(new URL('./pglite.worker.ts', import.meta.url), {type: 'module'});

    // The worker has no file access; it hands the pre-migration dump to this side.
    answerPremigrationDumps(worker, backup => writePremigrationBackup(backup.data));

    return worker;
};

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
    workerFactory: createDbWorker,
});

const loadAssets = async () => ({
    fsBundle: await loadPgliteFsBundle(pgliteDataUrl),
    wasmModule: await loadPgliteWasmModule(pgliteWasmUrl),
});

/*
 * A restore staged by Settings ▸ Storage is applied once, before the database
 * opens (see ./pendingRestore.ts). Every entry point waits for it.
 */
let pendingRestore: Promise<void> | null = null;
const ensureRestoreApplied = () => {
    pendingRestore ??= applyPendingRestore({
        readStaged: readStagedRestore,
        clearStaged: clearStagedRestore,
        validate: async dump => validateDump(dump, await loadAssets()),
        replace: async dump => replaceDataDirWithDump({
            dataDir: DATA_DIR,
            dump,
            assets: await loadAssets(),
        }),
        reportError: (message, error) => console.error(message, error),
    }).then(recordRestoreResult);

    return pendingRestore;
};

export const getLocalDb = async () => {
    await ensureRestoreApplied();

    return bootstrap.getLocalDb();
};
export const databaseHandover = bootstrap.handover;

/** Moves whenever script data is written; backups use it to skip unchanged data. */
export const readChangeMarker = async () => readDataChangeMarker(await getLocalDb());

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
export const prepareLocalDbWithProgress = async (onProgress: (update: DbBootstrapUpdate) => void) => {
    await ensureRestoreApplied();

    return bootstrap.prepareLocalDbWithProgress(onProgress);
};
export const dumpDataDir = bootstrap.dumpDataDir;

// Ask the browser to keep IndexedDB from being evicted under storage pressure.
export const requestPersistentStorage = async (): Promise<void> => {
    if (navigator.storage?.persist) {
        await navigator.storage.persist();
    }
};
