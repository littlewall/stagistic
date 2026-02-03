import {PGlite} from '@electric-sql/pglite';
import pgliteDataUrl from '@pglite-data?url';
import pgliteWasmUrl from '@pglite-wasm?url';
import {dbSchema} from '@stagistic/db';
import {drizzle, type PgliteDatabase} from 'drizzle-orm/pglite';

import {runMigrations as runCompiledMigrations} from './migrations';

const LOCAL_DB_PATH = 'idb://stagistic';

export type LocalDb = PgliteDatabase<typeof dbSchema>;

let clientPromise: Promise<PGlite> | null = null;
let dbPromise: Promise<LocalDb> | null = null;
let migrationsPromise: Promise<void> | null = null;
let fsBundlePromise: Promise<Blob> | null = null;
let wasmModulePromise: Promise<WebAssembly.Module> | null = null;

export type DbBootstrapStep = 'fs-bundle' | 'wasm' | 'client' | 'migrations' | 'ready';
export type DbBootstrapUpdate = {
    step: DbBootstrapStep,
    label: string,
    progress: number,
};

const loadFsBundle = async () => {
    if (!fsBundlePromise) {
        fsBundlePromise = (async () => {
            const response = await fetch(pgliteDataUrl);

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
            const response = await fetch(pgliteWasmUrl);

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
                dataDir: LOCAL_DB_PATH,
                fsBundle,
                wasmModule,
            });
        })();
    }

    return clientPromise;
};

export const runMigrations = async () => {
    if (!migrationsPromise) {
        migrationsPromise = (async () => {
            const client = await getClient();

            await runCompiledMigrations(client);
        })();
    }

    return migrationsPromise;
};

export const getLocalDb = async () => {
    if (!dbPromise) {
        dbPromise = (async () => {
            const client = await getClient();

            await runMigrations();

            return drizzle({client, schema: dbSchema});
        })();
    }

    return dbPromise;
};

export const prepareLocalDb = async () => {
    await getLocalDb();
};

export const prepareLocalDbWithProgress = async (
    onProgress: (update: DbBootstrapUpdate) => void,
) => {
    onProgress({
        step: 'fs-bundle',
        label: 'Načítám PGlite datový balík',
        progress: 0.1,
    });
    await loadFsBundle();

    onProgress({
        step: 'wasm',
        label: 'Načítám PGlite wasm modul',
        progress: 0.35,
    });
    await loadWasmModule();

    onProgress({
        step: 'client',
        label: 'Spouštím lokální databázi',
        progress: 0.6,
    });
    await getClient();

    onProgress({
        step: 'migrations',
        label: 'Aplikuji migrace',
        progress: 0.8,
    });
    await runMigrations();

    onProgress({
        step: 'ready',
        label: 'Finalizuji databázi',
        progress: 1,
    });
    await getLocalDb();
};
