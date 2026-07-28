import type {
    ScriptRepository,
    ScriptTitlePageRecord,
} from '@stagistic/db';
import type {TitlePageSettings} from '@stagistic/script';

import {
    createReactiveCollection,
    createRepositoryStoreRegistry,
} from '../collections';

export const createScriptTitlePageStore = (
    repository: ScriptRepository,
    scriptId: string,
) => {
    const source = repository.getScriptTitlePageSource(scriptId);
    const {
        collection,
        status,
        confirmed,
    } = createReactiveCollection<ScriptTitlePageRecord, string>({
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

export const getScriptTitlePageStore = createRepositoryStoreRegistry(
    createScriptTitlePageStore,
);
