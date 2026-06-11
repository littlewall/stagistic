import {PGlite} from '@electric-sql/pglite';
import {PGliteWorker} from '@electric-sql/pglite/worker';
import {drizzle, type PgliteDatabase} from 'drizzle-orm/pglite';

import {dbSchema} from '../schema';
import {runPgliteMigrations} from './migrations';

export type LocalDb = PgliteDatabase<typeof dbSchema>;

export type DbBootstrapStep = 'fs-bundle' | 'wasm' | 'client' | 'migrations' | 'ready';

export type DbBootstrapUpdate = {
    step: DbBootstrapStep,
    label: string,
    progress: number,
};

interface CreatePgliteBootstrapOptions {
    fsBundleUrl: string,
    wasmUrl: string,
    dataDir?: string,
    workerFactory?: () => Worker,
}

interface PgliteBootstrap {
    getLocalDb: () => Promise<LocalDb>,
    syncToFs: () => Promise<void>,
    runMigrations: () => Promise<void>,
    prepareLocalDb: () => Promise<void>,
    prepareLocalDbWithProgress: (onProgress: (update: DbBootstrapUpdate) => void) => Promise<void>,
}

const DEFAULT_DATA_DIR = 'idb://stagistic-main';

export const createPgliteBootstrap = ({
    fsBundleUrl,
    wasmUrl,
    dataDir = DEFAULT_DATA_DIR,
    workerFactory,
}: CreatePgliteBootstrapOptions): PgliteBootstrap => {
    if (workerFactory) {
        let dbPromise: Promise<LocalDb> | null = null;
        let workerInstanceRef: PGliteWorker | null = null;

        const getLocalDb = async (): Promise<LocalDb> => {
            if (!dbPromise) {
                dbPromise = (async () => {
                    const workerInstance = await PGliteWorker.create(
                        workerFactory(),
                        {dataDir},
                    );

                    workerInstanceRef = workerInstance;

                    return drizzle({
                        client: workerInstance as unknown as PGlite,
                        schema: dbSchema,
                    });
                })();
            }

            return dbPromise;
        };

        const syncToFs = async () => {
            if (!workerInstanceRef) {
                await getLocalDb();
            }

            await workerInstanceRef?.syncToFs();
        };

        return {
            getLocalDb,
            syncToFs,
            runMigrations: async () => {
                await getLocalDb();
            },
            prepareLocalDb: async () => {
                await getLocalDb();
            },
            prepareLocalDbWithProgress: async onProgress => {
                onProgress({
                    step: 'client',
                    label: 'Starting local database',
                    progress: 0.1,
                });

                await getLocalDb();

                onProgress({
                    step: 'ready',
                    label: 'Database ready',
                    progress: 1,
                });
            },
        };
    }

    // ── Direct (main-thread) path ─────────────────────────────────────────────
    let clientPromise: Promise<PGlite> | null = null;
    let dbPromise: Promise<LocalDb> | null = null;
    let migrationsPromise: Promise<void> | null = null;
    let fsBundlePromise: Promise<Blob> | null = null;
    let wasmModulePromise: Promise<WebAssembly.Module> | null = null;

    const loadFsBundle = async () => {
        if (!fsBundlePromise) {
            fsBundlePromise = (async () => {
                const response = await fetch(fsBundleUrl);

                if (!response.ok) {
                    throw new Error(`Failed to load PGlite fs bundle (${response.status})`);
                }

                return response.blob();
            })();
        }

        return fsBundlePromise;
    };

    const loadWasmModule = async () => {
        if (!wasmModulePromise) {
            wasmModulePromise = (async () => {
                const response = await fetch(wasmUrl);

                if (!response.ok) {
                    throw new Error(`Failed to load PGlite wasm (${response.status})`);
                }

                const bytes = await response.arrayBuffer();

                return WebAssembly.compile(bytes);
            })();
        }

        return wasmModulePromise;
    };

    const getClient = async () => {
        if (!clientPromise) {
            clientPromise = (async () => {
                const [fsBundle, wasmModule] = await Promise.all([loadFsBundle(), loadWasmModule()]);

                return PGlite.create({
                    dataDir,
                    fsBundle,
                    wasmModule,
                });
            })();
        }

        return clientPromise;
    };

    const runMigrations = async () => {
        if (!migrationsPromise) {
            migrationsPromise = (async () => {
                const client = await getClient();

                await runPgliteMigrations(client);
            })();
        }

        return migrationsPromise;
    };

    const getLocalDb = async () => {
        if (!dbPromise) {
            dbPromise = (async () => {
                const client = await getClient();

                await runMigrations();

                return drizzle({client, schema: dbSchema});
            })();
        }

        return dbPromise;
    };

    const prepareLocalDb = async () => {
        await getLocalDb();
    };

    const syncToFs = async () => {
        const client = await getClient();

        await client.syncToFs();
    };

    const prepareLocalDbWithProgress = async (
        onProgress: (update: DbBootstrapUpdate) => void,
    ) => {
        onProgress({
            step: 'fs-bundle',
            label: 'Loading data bundle',
            progress: 0.1,
        });
        await loadFsBundle();

        onProgress({
            step: 'wasm',
            label: 'Loading WASM module',
            progress: 0.35,
        });
        await loadWasmModule();

        onProgress({
            step: 'client',
            label: 'Starting local database',
            progress: 0.6,
        });
        await getClient();

        onProgress({
            step: 'migrations',
            label: 'Applying migrations',
            progress: 0.8,
        });
        await runMigrations();

        onProgress({
            step: 'ready',
            label: 'Finalizing database',
            progress: 1,
        });
        await getLocalDb();
    };

    return {
        getLocalDb,
        syncToFs,
        runMigrations,
        prepareLocalDb,
        prepareLocalDbWithProgress,
    };
};
