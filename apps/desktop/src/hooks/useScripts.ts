import type {ScriptSummary} from '@stagistic/db';
import type {SlateValue} from '@stagistic/shared';
import type {Script} from '@stagistic/ui';
import {useLiveQuery} from '@tanstack/react-db';
import {
    useCallback,
    useEffect,
    useMemo,
    useSyncExternalStore,
} from 'react';

import {scriptsCollection, scriptsStore} from '~store';

export const useScripts = () => {
    const meta = useSyncExternalStore(
        scriptsStore.subscribeMeta,
        scriptsStore.getMeta,
        scriptsStore.getMeta,
    );

    useEffect(() => {
        void scriptsStore.init();
    }, []);

    const {
        data,
        isLoading: isQueryLoading,
        status,
    } = useLiveQuery(
        q => q
            .from({scripts: scriptsCollection})
            .orderBy(({scripts}) => scripts.updatedAt, 'desc'),
    );

    const scripts = useMemo<Script[]>(
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
        (name: string, initialContent?: SlateValue) => scriptsStore.createScript(name, initialContent),
        [],
    );

    const renameScript = useCallback(
        (scriptId: string, name: string) => scriptsStore.renameScript(scriptId, name),
        [],
    );

    const deleteScript = useCallback(
        (scriptId: string) => scriptsStore.deleteScript(scriptId),
        [],
    );

    const setActiveBlock = useCallback(
        (scriptId: string, blockId: string | null) => scriptsStore.setActiveBlock(scriptId, blockId),
        [],
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
