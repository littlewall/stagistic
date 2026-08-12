import type {
    DuplicateScriptInput,
    RenameScriptInput,
    ScriptRepository,
    ScriptSummary,
} from '@stagistic/db';
import {
    createNodeId,
    ensureScriptBlockIds,
    ensureScriptStructure,
    getFirstBlockId,
    type ScriptDocument,
} from '@stagistic/script';
import {BasicIndex} from '@tanstack/react-db';

import {createReactiveCollection} from '../collections';

type PendingInsertCommand = () => Promise<void>;

const normalizeTitle = (title: string) => title.trim() || 'Untitled script';
const normalizeSubtitle = (subtitle: string | null) => {
    const trimmed = subtitle?.trim() ?? '';

    return trimmed || null;
};

const normalizeInitialContent = (initialContent?: ScriptDocument) => {
    let activeBlockId = createNodeId();

    if (!initialContent) {
        return {activeBlockId, content: undefined};
    }

    const content = ensureScriptStructure(ensureScriptBlockIds(initialContent));

    activeBlockId = getFirstBlockId(content) ?? activeBlockId;

    return {activeBlockId, content};
};

export const createScriptsStore = (repository: ScriptRepository) => {
    const pendingInserts = new Map<string, PendingInsertCommand>();
    const {
        collection: scriptsCollection,
        status,
    } = createReactiveCollection<ScriptSummary, string>({
        id: 'scripts',
        source: repository.scriptSummaries,
        getKey: script => script.id,
        handlers: {
            insert: async script => {
                const command = pendingInserts.get(script.id);

                if (!command) {
                    throw new Error(`Missing insert command for script ${script.id}`);
                }

                try {
                    await command();
                } finally {
                    pendingInserts.delete(script.id);
                }
            },
            update: async (original, modified, changes) => {
                if ('activeBlockId' in changes) {
                    await repository.setActiveBlock(
                        original.id,
                        modified.activeBlockId ?? null,
                    );

                    return;
                }

                if ('subtitle' in changes) {
                    await repository.renameScript(original.id, {
                        title: modified.title,
                        subtitle: modified.subtitle,
                    });

                    return;
                }

                if ('title' in changes) {
                    await repository.renameScriptTitle(original.id, modified.title);
                }
            },
            delete: script => repository.deleteScript(script.id),
        },
    });

    scriptsCollection.createIndex(script => script.updatedAt, {indexType: BasicIndex});

    const insertWithCommand = async (
        summary: ScriptSummary,
        command: PendingInsertCommand,
    ) => {
        pendingInserts.set(summary.id, command);

        const transaction = scriptsCollection.insert(summary);

        try {
            await transaction.isPersisted.promise;
        } catch (error) {
            pendingInserts.delete(summary.id);
            throw error;
        }
    };

    const createScript = async (title: string, initialContent?: ScriptDocument) => {
        const id = repository.allocateScriptId();
        const timestamp = Date.now();
        const normalizedTitle = normalizeTitle(title);
        const {activeBlockId, content} = normalizeInitialContent(initialContent);

        await insertWithCommand({
            id,
            title: normalizedTitle,
            subtitle: null,
            activeBlockId,
            createdAt: timestamp,
            updatedAt: timestamp,
        }, () => repository.createScriptWithId({
            id,
            title: normalizedTitle,
            initialContent: content,
            activeBlockId,
            timestamp,
        }));

        return id;
    };

    const renameScript = async (scriptId: string, input: RenameScriptInput) => {
        const transaction = scriptsCollection.update(scriptId, draft => {
            draft.title = normalizeTitle(input.title);
            draft.subtitle = normalizeSubtitle(input.subtitle);
        });

        await transaction.isPersisted.promise;
    };

    const renameScriptTitle = async (scriptId: string, title: string) => {
        const transaction = scriptsCollection.update(scriptId, draft => {
            draft.title = normalizeTitle(title);
        });

        await transaction.isPersisted.promise;
    };

    const duplicateScript = async (
        sourceScriptId: string,
        input: DuplicateScriptInput,
    ) => {
        const sourceScript = scriptsCollection.get(sourceScriptId);

        if (!sourceScript) {
            throw new Error(`Cannot duplicate missing script ${sourceScriptId}`);
        }

        const targetScriptId = repository.allocateScriptId();
        const timestamp = Date.now();
        const title = normalizeTitle(input.title);

        await insertWithCommand({
            ...sourceScript,
            id: targetScriptId,
            title,
            createdAt: timestamp,
            updatedAt: timestamp,
        }, () => repository.duplicateScriptWithId(sourceScriptId, {
            ...input,
            title,
            targetScriptId,
            timestamp,
        }));

        return targetScriptId;
    };

    const deleteScript = async (scriptId: string) => {
        const transaction = scriptsCollection.delete(scriptId);

        await transaction.isPersisted.promise;
    };

    const setActiveBlock = async (scriptId: string, blockId: string | null) => {
        const transaction = scriptsCollection.update(scriptId, draft => {
            draft.activeBlockId = blockId;
        });

        await transaction.isPersisted.promise;
    };

    const scriptsStore = {
        init: () => scriptsCollection.preload(),
        refresh: () => repository.scriptSummaries.refresh(),
        createScript,
        renameScript,
        renameScriptTitle,
        duplicateScript,
        deleteScript,
        setActiveBlock,
    };

    return {
        repository,
        scriptsCollection,
        scriptsStatus: status,
        scriptsStore,
    };
};

export type ScriptsStoreState = ReturnType<typeof createScriptsStore>;
