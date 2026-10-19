import {PGlite, type PGliteOptions} from '@electric-sql/pglite';
import {live} from '@electric-sql/pglite/live';

import {loadPgliteFsBundle, loadPgliteWasmModule} from './assets';
import {runPgliteMigrations} from './migrations';
import {startPgliteSyncEngine} from './startSyncEngine';

interface WorkerDbOptions extends Pick<PGliteOptions, 'dataDir' | 'relaxedDurability'> {
    fsBundleUrl: string,
    wasmUrl: string,
}

export const createPgliteWorkerDb = async ({
    fsBundleUrl,
    wasmUrl,
    dataDir = 'idb://stagistic-main',
    relaxedDurability = true,
}: WorkerDbOptions, syncOptions?: Parameters<typeof startPgliteSyncEngine>[1]) => {
    const [fsBundle, wasmModule] = await Promise.all([
        loadPgliteFsBundle(fsBundleUrl),
        loadPgliteWasmModule(wasmUrl),
    ]);
    const db = await PGlite.create({
        dataDir,
        extensions: {live},
        fsBundle,
        wasmModule,
        relaxedDurability,
    });

    await runPgliteMigrations(db);
    startPgliteSyncEngine(db, syncOptions);

    return db;
};
