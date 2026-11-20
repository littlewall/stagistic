import type {StartFailureInfo} from '@stagistic/shared';
import type {PgliteDatabase} from 'drizzle-orm/pglite';

import type {dbSchema} from '../schema';
import type {DatabaseHandover} from './dbHandover';

export type LocalDb = PgliteDatabase<typeof dbSchema>;

export type DbBootstrapStep = 'fs-bundle' | 'wasm' | 'client' | 'migrations' | 'ready';

export type DbBootstrapUpdate = {
    step: DbBootstrapStep,
    label: string,
    progress: number,
    // The step may legitimately run long (migrations, another tab), so a stall timer should not count it.
    longRunning?: boolean,
    // The start continues by itself but the writer has to act; the next update without it clears it.
    blocked?: StartFailureInfo,
    /*
     * The start waits for the database in another tab or a long migration, and
     * may exceed the stall limit without being a failure.
     */
    waitsForDatabase?: boolean,
};

// Mirrors PGlite's DumpTarCompressionOptions (not re-exported from the public entry).
export type DbDumpCompression = 'none' | 'gzip' | 'auto';

export interface PgliteBootstrap {
    getLocalDb: () => Promise<LocalDb>,
    // Resolves once earlier writes are in storage (survives closing the tab right after).
    syncToFs: () => Promise<void>,
    runMigrations: () => Promise<void>,
    prepareLocalDb: () => Promise<void>,
    prepareLocalDbWithProgress: (onProgress: (update: DbBootstrapUpdate) => void) => Promise<void>,
    // Snapshot the whole data dir as a single tarball (for backup/export/portability).
    dumpDataDir: (compression?: DbDumpCompression) => Promise<Blob>,
    // What an older tab does when a newer generation needs the database.
    handover: DatabaseHandover,
    // Stops the worker and leaves the database without saving, as closing the tab would.
    close: () => Promise<void>,
}
