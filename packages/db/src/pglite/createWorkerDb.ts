import {PGlite, type PGliteOptions} from '@electric-sql/pglite';
import {live} from '@electric-sql/pglite/live';
import {describeStartFailure} from '@stagistic/shared';

import {loadPgliteFsBundle, loadPgliteWasmModule} from './assets';
import {currentDbGeneration, formatDbGeneration} from './dbGeneration';
import {installFlushQueue, withDurableSyncToFs} from './durableSyncToFs';
import {runPgliteMigrations} from './migrations';
import {compiledPgliteVersion} from './migrations.compiled';
import {
    backUpBeforeMigrations,
    createIdbPremigrationBackupStore,
    type PremigrationBackupStore,
} from './premigrationBackup';
import {type WorkerStartMessage, workerStartMessage} from './workerStart';

interface WorkerDbOptions extends Pick<PGliteOptions, 'dataDir' | 'relaxedDurability'> {
    /**
     * Keeps one dump outside the database before pending migrations run
     * (see premigrationBackup.ts). Only applies to a persistent `idb://` database.
     */
    premigrationBackup?: boolean,
    /** Where the dump goes; defaults to an IndexedDB database next to the data. */
    premigrationBackupStore?: PremigrationBackupStore,
    fsBundleUrl: string,
    wasmUrl: string,
    /** Tells the page how the start is going; pass `postMessage` from the worker entry. */
    report?: (message: WorkerStartMessage) => void,
}

export const createPgliteWorkerDb = async ({
    fsBundleUrl,
    wasmUrl,
    dataDir = 'idb://stagistic-main',
    relaxedDurability = true,
    premigrationBackup = false,
    premigrationBackupStore,
    report,
}: WorkerDbOptions) => {
    try {
        report?.(workerStartMessage('loading-assets'));

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

        /*
         * The flush queue must wrap `fs.syncToFs` before migrations run, so relaxed
         * flushes during them never overlap one already in flight.
         */
        installFlushQueue(db);

        report?.(workerStartMessage('migrating'));
        await runPgliteMigrations(db, {
            beforePending: premigrationBackup && dataDir.startsWith('idb://')
                ? async pendingIds => {
                    report?.(workerStartMessage('backing-up'));
                    await backUpBeforeMigrations({
                        client: db,
                        store: premigrationBackupStore ?? createIdbPremigrationBackupStore(),
                        pgliteVersion: compiledPgliteVersion,
                        targetGeneration: formatDbGeneration(currentDbGeneration),
                        firstPendingId: pendingIds[0] ?? '',
                    });
                    report?.(workerStartMessage('migrating'));
                }
                : undefined,
        });
        report?.(workerStartMessage('ready'));

        return withDurableSyncToFs(db);
    } catch (error) {
        report?.(workerStartMessage('failed', describeStartFailure(error)));
        throw error;
    }
};
