import {PGlite, type PGliteOptions} from '@electric-sql/pglite';

import {RENAMED_MIGRATIONS} from './migrations';
import {compiledMigrations} from './migrations.compiled';

/*
 * Restoring a backup dump (gzipped tar of the PGlite data directory) into a
 * persistent store. PGlite loads a dump only into an empty database of the
 * same PGlite version, so the store is emptied first.
 *
 * Two steps so a bad file never costs the current data:
 * 1. `validateDump` opens the dump in a throwaway in-memory database. Nothing
 *    on disk changes; an unreadable file or another PGlite version fails here.
 * 2. `replaceDataDirWithDump` empties the store and loads the dump into it.
 */
export type PgliteAssets = Pick<PGliteOptions, 'fsBundle' | 'wasmModule'>;

export const validateDump = async (dump: Blob, assets: PgliteAssets = {}): Promise<void> => {
    const client = await PGlite.create({...assets, loadDataDir: dump});

    try {
        /*
         * PGlite turns an unreadable file into an empty database instead of failing,
         * so the dump must prove to be a Stagistic database this build understands.
         */
        const applied = await client.query<{id: string}>('SELECT id FROM __stagistic_migrations');

        if (applied.rows.length === 0) {
            throw new Error('The backup is not a Stagistic database.');
        }

        const known = new Set<string>(compiledMigrations.map(migration => migration.id));

        // Ids renamed after a database applied them are the same migration (migrations.ts relabels them on open).
        if (applied.rows.some(row => !known.has(RENAMED_MIGRATIONS[row.id] ?? row.id))) {
            throw new Error('The backup was made by a newer version of Stagistic.');
        }
    } finally {
        await client.close();
    }
};

/** PGlite mounts `idb://<name>` as the IndexedDB database `/pglite/<name>`. */
export const deleteIdbDataDir = (dataDir: string) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(`/pglite/${dataDir.replace(/^idb:\/\//, '')}`);

    request.addEventListener('success', () => resolve());
    request.addEventListener('error', () => reject(request.error ?? new Error('Deleting the database failed.')));
    // Another connection is still open: reject instead of waiting for it forever.
    request.addEventListener('blocked', () => reject(new Error('The database is still open.')));
});

interface ReplaceOptions {
    dataDir: string,
    dump: Blob,
    assets?: PgliteAssets,
    /** Empties the store; defaults to deleting the IndexedDB database. */
    emptyStore?: (dataDir: string) => Promise<void>,
}

export const replaceDataDirWithDump = async ({
    dataDir,
    dump,
    assets = {},
    emptyStore = deleteIdbDataDir,
}: ReplaceOptions): Promise<void> => {
    await emptyStore(dataDir);

    const client = await PGlite.create({
        ...assets,
        dataDir,
        loadDataDir: dump,
        relaxedDurability: false,
    });

    try {
        await client.syncToFs();
    } finally {
        await client.close();
    }
};
