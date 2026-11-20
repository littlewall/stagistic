import type {PGlite} from '@electric-sql/pglite';

import {currentDbGeneration, formatDbGeneration} from './dbGeneration';

/*
 * One dump of the whole data directory, taken before pending migrations run.
 *
 * Stored in its own IndexedDB database, not inside the PGlite data directory:
 * a failed start terminates the database worker, and the page must still reach
 * the dump after that and after a reload. IndexedDB is what the data already
 * lives in (no new capability), works in workers and pages, and one `put` in
 * one transaction replaces the previous dump atomically: the old dump stays
 * until the new one is fully stored. OPFS has no such replace; it needs a
 * temporary file and a rename, and is unreliable in macOS WKWebView.
 *
 * The dump is a gzipped tar of the PGlite data directory (`dumpDataDir('gzip')`).
 * PGlite restores it with `PGlite.create({loadDataDir: file})`, into an empty
 * database of the same PGlite version. Stagistic has no import for it yet.
 */
export interface PremigrationBackup {
    createdAt: number,
    pgliteVersion: string,
    /** The generation (see dbGeneration.ts) the update was heading for when the dump was taken. */
    targetGeneration: string,
    /** The first migration that was pending when the dump was taken. */
    firstPendingMigrationId: string,
    /** Gzipped tar archive of the PGlite data directory. */
    data: ArrayBuffer,
}

export interface PremigrationBackupStore {
    /** Replaces the stored dump; the previous one survives a failed save. */
    save: (backup: PremigrationBackup) => Promise<void>,
    clear: () => Promise<void>,
    load: () => Promise<PremigrationBackup | null>,
}

export interface PremigrationBackupFile {
    fileName: string,
    createdAt: number,
    blob: Blob,
}

export const PREMIGRATION_BACKUP_DB_NAME = 'stagistic-premigration-backup';

const STORE_NAME = 'backup';
const RECORD_KEY = 'latest';

const requestToPromise = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error ?? new Error('IndexedDB request failed.')));
});

const openBackupDb = () => {
    const request = indexedDB.open(PREMIGRATION_BACKUP_DB_NAME, 1);

    request.addEventListener('upgradeneeded', () => request.result.createObjectStore(STORE_NAME));

    return requestToPromise(request);
};

/** Resolves when the transaction has committed, which is when a quota failure surfaces. */
const inTransaction = async <T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
) => {
    const db = await openBackupDb();

    try {
        return await new Promise<T>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, mode);
            const request = run(transaction.objectStore(STORE_NAME));

            transaction.addEventListener('complete', () => resolve(request.result));
            transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.')));
        });
    } finally {
        db.close();
    }
};

export const createIdbPremigrationBackupStore = (): PremigrationBackupStore => ({
    save: async backup => {
        await inTransaction('readwrite', store => store.put(backup, RECORD_KEY));
    },
    clear: async () => {
        await inTransaction('readwrite', store => store.delete(RECORD_KEY));
    },
    load: async () => {
        const stored = await inTransaction<unknown>('readonly', store => store.get(RECORD_KEY));

        return (stored as PremigrationBackup | undefined) ?? null;
    },
});

const pad = (value: number) => String(value).padStart(2, '0');

/** UTC, so the name sorts and does not depend on the writer's time zone. */
export const premigrationBackupFileName = (createdAt: number) => {
    const date = new Date(createdAt);
    const day = `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
    const time = `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;

    return `stagistic-before-update-${day}T${time}Z.pgdata.tar.gz`;
};

/** The stored dump ready to download, or null when none exists for the current update or storage cannot be read. */
export const readPremigrationBackupFile = async (
    store: PremigrationBackupStore = createIdbPremigrationBackupStore(),
): Promise<PremigrationBackupFile | null> => {
    try {
        const backup = await store.load();

        if (!backup || backup.targetGeneration !== formatDbGeneration(currentDbGeneration)) {
            // A dump from a different update is not "taken before this update".
            return null;
        }

        return {
            fileName: premigrationBackupFileName(backup.createdAt),
            createdAt: backup.createdAt,
            blob: new Blob([backup.data], {type: 'application/gzip'}),
        };
    } catch (error) {
        console.error('[db] Could not read the pre-migration backup.', error);

        return null;
    }
};

const isQuotaError = (error: unknown) => error instanceof DOMException && error.name === 'QuotaExceededError';

interface BackUpOptions {
    client: Pick<PGlite, 'dumpDataDir'>,
    store: PremigrationBackupStore,
    pgliteVersion: string,
    /** The generation this start migrates towards. */
    targetGeneration: string,
    firstPendingId: string,
    now?: () => number,
}

/*
 * Pending migrations at the start of a build that already dumped for this
 * target mean the earlier attempt did not finish (a failed migration, or a tab
 * closed in the middle): every reload would otherwise overwrite the dump with
 * a database that may be partly migrated. Keeping the first dump keeps the one
 * from before the update attempt. A different target is a new update and
 * replaces it. An unreadable store counts as no earlier dump.
 */
const isFromEarlierAttempt = async (store: PremigrationBackupStore, targetGeneration: string) => {
    try {
        return (await store.load())?.targetGeneration === targetGeneration;
    } catch {
        return false;
    }
};

/*
 * Never throws: the migration goes on without a backup. A migration is one
 * transaction and only adds, so the data stays whole when it fails; refusing to
 * start would lock every writer out of their scripts for as long as storage is
 * full. When the previous dump stands in the way (the old and new dump together
 * exceed the quota), the new one is worth more than the old one, so it is
 * dropped and the save tried once more.
 */
export const backUpBeforeMigrations = async ({
    client,
    store,
    pgliteVersion,
    targetGeneration,
    firstPendingId,
    now = Date.now,
}: BackUpOptions): Promise<'stored' | 'not-stored' | 'kept-first'> => {
    try {
        if (await isFromEarlierAttempt(store, targetGeneration)) {
            return 'kept-first';
        }

        const dump = await client.dumpDataDir('gzip');
        const backup: PremigrationBackup = {
            createdAt: now(),
            pgliteVersion,
            targetGeneration,
            firstPendingMigrationId: firstPendingId,
            data: await dump.arrayBuffer(),
        };

        try {
            await store.save(backup);
        } catch (error) {
            if (!isQuotaError(error)) {
                throw error;
            }

            await store.clear();
            await store.save(backup);
        }

        return 'stored';
    } catch (error) {
        console.error('[db] Pre-migration backup was not stored; migrating without it.', error);

        return 'not-stored';
    }
};
