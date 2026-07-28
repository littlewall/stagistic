import type {ScriptRepository} from '@stagistic/db';

import {createRepositoryStoreRegistry} from '../collections';
import {
    createScriptCharactersStore,
} from './scriptCharactersStore';

export const getScriptCharactersStore = createRepositoryStoreRegistry<
    ScriptRepository,
    ReturnType<typeof createScriptCharactersStore>
>(createScriptCharactersStore);
