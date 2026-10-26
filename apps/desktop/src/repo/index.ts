import {createSnapshotViewRepository} from '@stagistic/app-core';
import {createLocalPgliteRepository, type ScriptRepository} from '@stagistic/db';

import {
    createSnapshotViewDb,
    getLocalDb,
    syncToFs,
} from '~db';

import {TauriFsFileStorage} from '../fileStorage/TauriFsFileStorage';

const fileStorage = new TauriFsFileStorage();

export const scriptRepository: ScriptRepository = createLocalPgliteRepository({
    getLocalDb,
    syncToFs,
    fileStorage,
});
// Loaded once the database is ready, so this runs once per app start.
void scriptRepository.collectUnreferencedFiles().catch((error: unknown) => {
    console.error('[files] Failed to collect unreferenced blobs.', error);
});

export const snapshotViews = createSnapshotViewRepository({
    createLocalDb: createSnapshotViewDb,
    fileStorage,
});
export type {ScriptRepository} from '@stagistic/db';
