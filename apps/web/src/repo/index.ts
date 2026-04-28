import type {ScriptRepository} from '@stagistic/db';

import {createLocalPgliteRepository} from './localPgliteRepo';

export const scriptRepository: ScriptRepository = createLocalPgliteRepository();
export type {ScriptRepository} from '@stagistic/db';
