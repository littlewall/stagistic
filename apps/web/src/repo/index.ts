import type {ScriptRepository} from '@stagistic/sync-core';

import {createLocalPgliteRepository} from '../../../desktop/src/repo/localPgliteRepo';

export const scriptRepository: ScriptRepository = createLocalPgliteRepository();
export type {ScriptRepository} from '@stagistic/sync-core';
