import type {ScriptSummary} from '@stagistic/db';
import type {ScriptDocument} from '@stagistic/script-core';
import {useLiveQuery} from '@tanstack/react-db';
import {
    useCallback,
    useEffect,
    useMemo,
    useSyncExternalStore,
} from 'react';

import {useScriptsContext} from './ScriptRepositoryProvider';

type ScriptListItem = {
    id: string,
    name: string,
};

export const useScripts = () => {
    const {
        scriptsCollection,
        scriptsStore,
    } = useScriptsContext();
    const meta = useSyncExternalStore(
        scriptsStore.subscribeMeta,
        scriptsStore.getMeta,
        scriptsStore.getMeta,
    );

    useEffect(() => {
        void scriptsStore.init();
    }, [scriptsStore]);

    const {
        data,
        isLoading: isQueryLoading,
        status,
    } = useLiveQuery(
        q => q
            .from({scripts: scriptsCollection})
            .orderBy(({scripts}) => scripts.updatedAt, 'desc'),
    );

    const scripts = useMemo<ScriptListItem[]>(
        () => (data ?? []).map((summary: ScriptSummary) => ({
            id: summary.id,
            name: summary.title,
        })),
        [data],
    );
    const scriptSummaries = useMemo<ScriptSummary[]>(
        () => data ?? [],
        [data],
    );

    const createScript = useCallback(
        (name: string, initialContent?: ScriptDocument) => scriptsStore.createScript(name, initialContent),
        [scriptsStore],
    );

    const renameScript = useCallback(
        (scriptId: string, name: string) => scriptsStore.renameScript(scriptId, name),
        [scriptsStore],
    );

    const deleteScript = useCallback(
        (scriptId: string) => scriptsStore.deleteScript(scriptId),
        [scriptsStore],
    );

    const setActiveBlock = useCallback(
        (scriptId: string, blockId: string | null) => scriptsStore.setActiveBlock(scriptId, blockId),
        [scriptsStore],
    );

    return {
        scripts,
        scriptSummaries,
        createScript,
        renameScript,
        deleteScript,
        setActiveBlock,
        refreshScripts: scriptsStore.refresh,
        isLoading: meta.isLoading || isQueryLoading || status === 'idle',
        error: meta.error,
    };
};
