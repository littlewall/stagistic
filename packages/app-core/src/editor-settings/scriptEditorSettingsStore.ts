import type {
    ScriptEditorSettingsRecord,
    ScriptRepository,
} from '@stagistic/db';
import type {EditorSettingsOverride, FormatTemplateId} from '@stagistic/script';

import {
    createReactiveCollection,
    createRepositoryStoreRegistry,
} from '../collections';

const hasPersistedValue = (value: unknown): boolean => {
    if (value === undefined || value === null) {
        return false;
    }

    if (typeof value !== 'object') {
        return true;
    }

    return Object.values(value).some(hasPersistedValue);
};

export const createScriptEditorSettingsStore = (
    repository: ScriptRepository,
    scriptId: string,
) => {
    const source = repository.getScriptEditorSettingsSource(scriptId);
    const {
        collection,
        status,
        confirmed,
    } = createReactiveCollection<ScriptEditorSettingsRecord, string>({
        id: `script-editor-settings:${scriptId}`,
        source,
        getKey: record => record.scriptId,
        handlers: {
            insert: record => repository.saveScriptSettings(scriptId, record.settings, record.formatTemplateId),
            update: (_original, modified) => repository.saveScriptSettings(scriptId, modified.settings, modified.formatTemplateId),
            delete: () => repository.deleteScriptSettings(scriptId),
        },
    });

    const save = async (settings: EditorSettingsOverride, formatTemplateId?: FormatTemplateId | null) => {
        const existing = collection.get(scriptId);

        const nextTemplateId = formatTemplateId === undefined ? existing?.formatTemplateId : formatTemplateId;

        if (!hasPersistedValue(settings) && !nextTemplateId) {
            if (!existing) {
                return;
            }

            const transaction = collection.delete(scriptId);

            await transaction.isPersisted.promise;

            return;
        }

        const transaction = existing
            ? collection.update(scriptId, draft => {
                draft.settings = settings;

                if (formatTemplateId !== undefined) draft.formatTemplateId = formatTemplateId;
            })
            : collection.insert({
                scriptId,
                settings,
                formatTemplateId: nextTemplateId,
            });

        await transaction.isPersisted.promise;
    };

    return {
        collection,
        status,
        confirmed,
        save,
    };
};

export type ScriptEditorSettingsStore = ReturnType<typeof createScriptEditorSettingsStore>;

export const getScriptEditorSettingsStore = createRepositoryStoreRegistry(
    createScriptEditorSettingsStore,
);
