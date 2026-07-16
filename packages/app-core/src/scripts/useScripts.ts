import type {
    DuplicateScriptInput,
    RenameScriptInput,
    ScriptSummary,
} from '@stagistic/db';
import type {ScriptDocument} from '@stagistic/script';
import {useLiveQuery} from '@tanstack/react-db';
import {
    useCallback,
    useEffect,
    useMemo,
    useSyncExternalStore,
} from 'react';

import {toScriptListItem} from './mappers';
import {useScriptsContext} from './ScriptRepositoryProvider';
import type {ScriptListItem} from './types';

export const useScripts = () => {
    const {
        scriptsCollection,
        scriptsStatus,
        scriptsStore,
    } = useScriptsContext();
    const storeStatus = useSyncExternalStore(
        scriptsStatus.subscribe,
        scriptsStatus.getSnapshot,
        scriptsStatus.getSnapshot,
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
        () => (data ?? []).map((summary: ScriptSummary) => toScriptListItem(summary)),
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
        (scriptId: string, input: RenameScriptInput) => scriptsStore.renameScript(scriptId, input),
        [scriptsStore],
    );

    const renameScriptTitle = useCallback(
        (scriptId: string, title: string) => scriptsStore.renameScriptTitle(scriptId, title),
        [scriptsStore],
    );

    const duplicateScript = useCallback(
        (sourceScriptId: string, input: DuplicateScriptInput) => scriptsStore.duplicateScript(sourceScriptId, input),
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
        renameScriptTitle,
        duplicateScript,
        deleteScript,
        setActiveBlock,
        refreshScripts: scriptsStore.refresh,
        isLoading: !storeStatus.isReady || isQueryLoading || status === 'idle',
        error: storeStatus.sourceError
            ?? storeStatus.mutations.find(mutation => mutation.status === 'failed')?.error
            ?? null,
    };
};
