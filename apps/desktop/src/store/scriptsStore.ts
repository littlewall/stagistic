import type {ScriptSummary} from '@stagistic/db';
import {
    createNodeId,
    type SlateValue,
} from '@stagistic/shared';
import {
    createCollection,
    localOnlyCollectionOptions,
} from '@tanstack/react-db';

import {scriptRepository} from '~repo';
import {
    ensureNodeIds,
    ensureSceneHeading,
    getFirstBlockId,
    isSlateValueEmpty,
} from '~utils/editorDefaults';

type ScriptsMeta = {
    isLoading: boolean,
    error: Error | null,
};

type Listener = () => void;

const metaListeners = new Set<Listener>();
let metaState: ScriptsMeta = {
    isLoading: true,
    error: null,
};

const emitMeta = () => {
    metaListeners.forEach(listener => listener());
};

const setMeta = (partial: Partial<ScriptsMeta>) => {
    metaState = {
        ...metaState,
        ...partial,
    };
    emitMeta();
};

export const scriptsCollection = createCollection(
    localOnlyCollectionOptions<ScriptSummary, string>({
        id: 'scripts',
        getKey: script => script.id,
        initialData: [],
        syncMode: 'eager',
    }),
);

const replaceAll = async (scripts: ScriptSummary[]) => {
    const existingIds = Array.from(scriptsCollection.keys());

    if (existingIds.length > 0) {
        const deleteTx = scriptsCollection.delete(existingIds);

        await deleteTx.isPersisted.promise;
    }

    if (scripts.length > 0) {
        const insertTx = scriptsCollection.insert(scripts);

        await insertTx.isPersisted.promise;
    }
};

let initPromise: Promise<void> | null = null;

const refresh = async () => {
    setMeta({isLoading: true});

    try {
        const scripts = await scriptRepository.listScripts();

        await replaceAll(scripts);
        setMeta({error: null, isLoading: false});
    } catch (error) {
        console.error('Failed to refresh scripts collection', error);
        setMeta({error: error as Error, isLoading: false});
        throw error;
    }
};

const init = async () => {
    if (!initPromise) {
        initPromise = scriptsCollection.preload().then(refresh);
    }

    return initPromise;
};

const createScript = async (title: string, initialContent?: SlateValue) => {
    let activeBlockId = createNodeId();
    let normalizedContent: SlateValue | undefined;

    if (initialContent && !isSlateValueEmpty(initialContent)) {
        const normalized = ensureSceneHeading(initialContent);
        const withIds = ensureNodeIds(normalized);

        normalizedContent = withIds;
        activeBlockId = getFirstBlockId(withIds) ?? activeBlockId;
    }

    const id = await scriptRepository.createScript(title, normalizedContent);

    await scriptRepository.setActiveBlock(id, activeBlockId);

    await refresh();

    return id;
};

const renameScript = async (scriptId: string, title: string) => {
    await scriptRepository.renameScript(scriptId, title);
    await refresh();
};

const deleteScript = async (scriptId: string) => {
    await scriptRepository.deleteScript(scriptId);
    await refresh();
};

const setActiveBlock = async (scriptId: string, blockId: string | null) => {
    await scriptRepository.setActiveBlock(scriptId, blockId);
    scriptsCollection.update(scriptId, draft => {
        draft.activeBlockId = blockId ?? null;
    });
};

export const scriptsStore = {
    getMeta: () => metaState,
    subscribeMeta: (listener: Listener) => {
        metaListeners.add(listener);

        return () => metaListeners.delete(listener);
    },
    init,
    refresh,
    createScript,
    renameScript,
    deleteScript,
    setActiveBlock,
};
