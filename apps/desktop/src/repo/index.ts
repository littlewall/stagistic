import type {ScriptRepository} from '@stagistic/sync-core';

import {createLocalSqliteRepository} from './localSqliteRepo';

export const scriptRepository: ScriptRepository = createLocalSqliteRepository();
export type {ScriptRepository} from '@stagistic/sync-core';
