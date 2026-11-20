import pgliteDataUrl from '@pglite-data?url';
import pgliteWasmUrl from '@pglite-wasm?url';
import {guardRuntimeFile} from '@stagistic/app-core';
import {createPgliteBootstrap} from '@stagistic/db/pglite';
import {uuidv7} from '@stagistic/shared';

const bootstrap = createPgliteBootstrap({
    fsBundleUrl: pgliteDataUrl,
    wasmUrl: pgliteWasmUrl,
    dataDir: 'idb://stagistic-main',
    workerFactory: () => new Worker(new URL('./pglite.worker.ts', import.meta.url), {type: 'module'}),
});

export const getLocalDb = bootstrap.getLocalDb;
export const databaseHandover = bootstrap.handover;
export const syncToFs = bootstrap.syncToFs;
export const prepareLocalDbWithProgress = bootstrap.prepareLocalDbWithProgress;
// The dump kept before the last migration; the worker that wrote it may be gone by the time this is read.
export {readPremigrationBackupFile} from '@stagistic/db/pglite';

const SNAPSHOT_VIEW_START_TIMEOUT_MS = 30_000;

interface SnapshotViewDbOptions {
    workerFactory?: () => Worker,
    timeoutMs?: number,
}

/*
 * Private in-memory database for viewing a stored draft or version. The unique
 * worker id keeps other tabs from sharing it through leader election.
 *
 * Its worker is loaded only when a preview opens, long after the page. After a
 * deploy the file may be gone and the host answers with a page instead, which
 * fails to load or never answers. Either asks the writer to reload.
 */
export const openSnapshotViewDb = ({
    workerFactory = () => new Worker(new URL('./pglite.worker.ts', import.meta.url), {type: 'module'}),
    timeoutMs = SNAPSHOT_VIEW_START_TIMEOUT_MS,
}: SnapshotViewDbOptions = {}) => guardRuntimeFile(
    createPgliteBootstrap({
        fsBundleUrl: pgliteDataUrl,
        wasmUrl: pgliteWasmUrl,
        dataDir: 'memory://',
        workerId: `stagistic-snapshot-view:${uuidv7()}`,
        workerFactory,
    }).getLocalDb(),
    {description: 'The Script Version preview could not start.', timeoutMs},
);

export const createSnapshotViewDb = () => openSnapshotViewDb();
