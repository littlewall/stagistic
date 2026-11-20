import {PGlite} from '@electric-sql/pglite';
import {live} from '@electric-sql/pglite/live';
import {drizzle} from 'drizzle-orm/pglite';

import {dbSchema} from '../schema';
import {loadPgliteFsBundle, loadPgliteWasmModule} from './assets';
import type {
    DbBootstrapUpdate,
    DbDumpCompression,
    LocalDb,
    PgliteBootstrap,
} from './bootstrapTypes';
import {createDatabaseHandover} from './dbHandover';
import {flushPgliteToStorage, installFlushQueue} from './durableSyncToFs';
import {runPgliteMigrations} from './migrations';

interface DirectBootstrapOptions {
    fsBundleUrl: string,
    wasmUrl: string,
    dataDir: string,
}

/** The database runs on the calling thread, private to it: no leader, no other tab, no handover. */
export const createDirectBootstrap = ({
    fsBundleUrl,
    wasmUrl,
    dataDir,
}: DirectBootstrapOptions): PgliteBootstrap => {
    let clientPromise: Promise<PGlite> | null = null;
    let dbPromise: Promise<LocalDb> | null = null;
    let migrationsPromise: Promise<void> | null = null;
    let fsBundlePromise: Promise<Blob> | null = null;
    let wasmModulePromise: Promise<WebAssembly.Module> | null = null;

    const loadFsBundle = async () => {
        if (!fsBundlePromise) {
            fsBundlePromise = loadPgliteFsBundle(fsBundleUrl);
        }

        return fsBundlePromise;
    };

    const loadWasmModule = async () => {
        if (!wasmModulePromise) {
            wasmModulePromise = loadPgliteWasmModule(wasmUrl);
        }

        return wasmModulePromise;
    };

    const getClient = async () => {
        if (!clientPromise) {
            clientPromise = (async () => {
                const [fsBundle, wasmModule] = await Promise.all([loadFsBundle(), loadWasmModule()]);

                const client = await PGlite.create({
                    dataDir,
                    extensions: {live},
                    fsBundle,
                    wasmModule,
                    relaxedDurability: true,
                });

                return installFlushQueue(client);
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

        await flushPgliteToStorage(client);
    };

    const dumpDataDir = async (compression?: DbDumpCompression): Promise<Blob> => {
        const client = await getClient();

        return client.dumpDataDir(compression);
    };

    const prepareLocalDbWithProgress = async (onProgress: (update: DbBootstrapUpdate) => void) => {
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
            longRunning: true,
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
        dumpDataDir,
        handover: createDatabaseHandover().handover,
        close: async () => {
            await clientPromise?.then(client => client.close());
        },
        runMigrations,
        prepareLocalDb,
        prepareLocalDbWithProgress,
    };
};
