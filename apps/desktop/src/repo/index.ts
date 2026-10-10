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
export const snapshotViews = createSnapshotViewRepository({
    createLocalDb: createSnapshotViewDb,
    fileStorage,
});
export type {ScriptRepository} from '@stagistic/db';
