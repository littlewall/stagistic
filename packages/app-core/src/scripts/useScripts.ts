import type {ScriptSummary} from '@stagistic/db';
import {useLiveQuery} from '@tanstack/react-db';
import {
    useEffect,
    useMemo,
} from 'react';

import {useReactiveCollectionStatus} from '../collections';
import {toScriptListItem} from './mappers';
import {useScriptsContext} from './ScriptRepositoryProvider';
import type {ScriptListItem} from './types';
import {useScriptActions} from './useScriptActions';

export const useScripts = () => {
    const {
        scriptsCollection,
        scriptsStatus,
        scriptsStore,
    } = useScriptsContext();
    const actions = useScriptActions();
    const storeStatus = useReactiveCollectionStatus(scriptsStatus);

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

    return {
        scripts,
        scriptSummaries,
        ...actions,
        refreshScripts: scriptsStore.refresh,
        isLoading: !storeStatus.isReady || isQueryLoading || status === 'idle',
        error: storeStatus.sourceError
            ?? storeStatus.mutations.find(mutation => mutation.status === 'failed')?.error
            ?? null,
    };
};
