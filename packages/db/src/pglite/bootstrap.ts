import type {PgliteBootstrap} from './bootstrapTypes';
import {currentDbGeneration, type DbGeneration} from './dbGeneration';
import {createDirectBootstrap} from './directBootstrap';
import {createWorkerBootstrap} from './workerBootstrap';

export type {
    DbBootstrapStep,
    DbBootstrapUpdate,
    DbDumpCompression,
    LocalDb,
} from './bootstrapTypes';

interface CreatePgliteBootstrapOptions {
    fsBundleUrl: string,
    wasmUrl: string,
    dataDir?: string,
    workerFactory?: () => Worker,
    /*
     * Tabs share one leader per id. A persistent database gets its id from its
     * generation, which also keeps other generations off it (see dbGuard).
     * Pass a unique id for a database that must stay private to a tab.
     */
    workerId?: string,
    // This build's generation; tests pass another one to stand in for a different build.
    generation?: DbGeneration,
    handoverTimeoutMs?: number,
    handoverSaveTimeoutMs?: number,
}

const DEFAULT_DATA_DIR = 'idb://stagistic-main';

export const createPgliteBootstrap = ({
    fsBundleUrl,
    wasmUrl,
    dataDir = DEFAULT_DATA_DIR,
    workerFactory,
    workerId,
    generation = currentDbGeneration,
    handoverTimeoutMs,
    handoverSaveTimeoutMs,
}: CreatePgliteBootstrapOptions): PgliteBootstrap => {
    if (workerFactory) {
        return createWorkerBootstrap({
            dataDir,
            workerFactory,
            workerId,
            generation,
            handoverTimeoutMs,
            handoverSaveTimeoutMs,
        });
    }

    return createDirectBootstrap({
        fsBundleUrl,
        wasmUrl,
        dataDir,
    });
};
