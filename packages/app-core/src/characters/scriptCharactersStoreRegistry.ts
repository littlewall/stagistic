import type {ScriptRepository} from '@stagistic/db';

import {
    createScriptCharactersStore,
    type ScriptCharactersStore,
} from './scriptCharactersStore';

const storesByRepository = new WeakMap<
    ScriptRepository,
    Map<string, ScriptCharactersStore>
>();

export const getScriptCharactersStore = (
    repository: ScriptRepository,
    scriptId: string,
) => {
    let stores = storesByRepository.get(repository);

    if (!stores) {
        stores = new Map();
        storesByRepository.set(repository, stores);
    }

    const existing = stores.get(scriptId);

    if (existing) {
        return existing;
    }

    const store = createScriptCharactersStore(repository, scriptId);

    stores.set(scriptId, store);

    return store;
};
