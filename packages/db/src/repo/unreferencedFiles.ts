import {getUuidv7Timestamp} from '@stagistic/shared';

import * as dbQueries from '../queries';
import type {FileStorage} from '../storage/fileStorage';
import type {GetDb} from './types';

/** Blobs younger than this may belong to a row another tab has not committed yet. */
export const UNREFERENCED_FILE_MIN_AGE_MS = 60 * 60 * 1000;

export interface CollectUnreferencedFilesOptions {
    minAgeMs?: number,
    now?: number,
}

/**
 * Delete blobs no row references. Mutations never delete a blob of a committed
 * row themselves: with relaxed durability `syncToFs` does not wait for the
 * write, so a reload can bring back a deleted row whose blob is already gone.
 * Collecting at startup, against the state that actually persisted, avoids
 * that. Keys that are not UUIDv7 have no known age and are kept.
 */
export const createUnreferencedFilesCollector = ({getDb, fileStorage}: {getDb: GetDb, fileStorage: FileStorage}) => {
    return async ({minAgeMs = UNREFERENCED_FILE_MIN_AGE_MS, now = Date.now()}: CollectUnreferencedFilesOptions = {}): Promise<number> => {
        const [keys, referenced] = await Promise.all([
            fileStorage.listKeys(),
            getDb().then(db => dbQueries.listReferencedStorageKeys(db)),
        ]);
        const unreferenced = keys.filter(key => {
            const createdAt = getUuidv7Timestamp(key);

            return !referenced.has(key) && createdAt !== null && now - createdAt >= minAgeMs;
        });
        const results = await Promise.allSettled(unreferenced.map(key => fileStorage.delete(key)));

        if (results.some(result => result.status === 'rejected')) {
            console.error('[files] Failed to clean up some unreferenced blobs.');
        }

        return results.filter(result => result.status === 'fulfilled').length;
    };
};
