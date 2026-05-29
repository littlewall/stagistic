import {createLocalPgliteRepository, type ScriptRepository} from '@stagistic/db';

import {getLocalDb, syncToFs} from '~db';

export const scriptRepository: ScriptRepository = createLocalPgliteRepository({getLocalDb, syncToFs});
export type {ScriptRepository} from '@stagistic/db';
