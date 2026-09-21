import {createLocalPgliteRepository, type ScriptRepository} from '@stagistic/db';
import {getLocalDb, syncToFs} from '~db';

import {TauriFsFileStorage} from '../fileStorage/TauriFsFileStorage';

export const scriptRepository: ScriptRepository = createLocalPgliteRepository({
    getLocalDb,
    syncToFs,
    fileStorage: new TauriFsFileStorage(),
});
export type {ScriptRepository} from '@stagistic/db';
