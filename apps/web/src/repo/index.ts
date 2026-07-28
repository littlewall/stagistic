import {createLocalPgliteRepository, type ScriptRepository} from '@stagistic/db';

import {getLocalDb, syncToFs} from '~db';
import {IndexedDbFileStorage} from '~db/fileStorage';

export const scriptRepository: ScriptRepository = createLocalPgliteRepository({
    getLocalDb,
    syncToFs,
    fileStorage: new IndexedDbFileStorage(),
});
export type {ScriptRepository} from '@stagistic/db';
