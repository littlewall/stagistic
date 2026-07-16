import type {
    ScriptRepository,
    ScriptTitlePageRecord,
} from '@stagistic/db';
import type {TitlePageSettings} from '@stagistic/script';

import {
    createReactiveCollection,
    createReactiveSourceStore,
} from '../collections';

export const createScriptTitlePageStore = (
    repository: ScriptRepository,
    scriptId: string,
) => {
    const source = repository.getScriptTitlePageSource(scriptId);
    const confirmed = createReactiveSourceStore(source);
    const {collection, status} = createReactiveCollection<ScriptTitlePageRecord, string>({
        id: `script-title-page:${scriptId}`,
        source,
        getKey: record => record.scriptId,
        handlers: {
            insert: record => repository.saveTitlePage(scriptId, record.settings),
            update: (_original, modified) => repository.saveTitlePage(scriptId, modified.settings),
            delete: () => repository.deleteTitlePage(scriptId),
        },
    });

    const save = async (settings: TitlePageSettings) => {
        const existing = collection.get(scriptId);
        const transaction = existing
            ? collection.update(scriptId, draft => {
                draft.settings = settings;
            })
            : collection.insert({scriptId, settings});

        await transaction.isPersisted.promise;
    };

    return {
        collection,
        status,
        confirmed,
        save,
    };
};

export type ScriptTitlePageStore = ReturnType<typeof createScriptTitlePageStore>;

const storesByRepository = new WeakMap<
    ScriptRepository,
    Map<string, ScriptTitlePageStore>
>();

export const getScriptTitlePageStore = (
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

    const store = createScriptTitlePageStore(repository, scriptId);

    stores.set(scriptId, store);

    return store;
};
