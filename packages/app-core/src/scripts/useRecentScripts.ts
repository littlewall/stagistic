import type {ScriptSummary} from '@stagistic/db';
import {useLiveQuery} from '@tanstack/react-db';
import {
    useCallback,
    useMemo,
    useSyncExternalStore,
} from 'react';

import {toScriptListItem} from './mappers';
import {useScriptsContext} from './ScriptRepositoryProvider';
import type {RecentScriptsState, ScriptListItem} from './types';

export const useRecentScripts = (limit = 3): RecentScriptsState => {
    const {
        repository,
        scriptsCollection,
        scriptsStatus,
    } = useScriptsContext();
    const storeStatus = useSyncExternalStore(
        scriptsStatus.subscribe,
        scriptsStatus.getSnapshot,
        scriptsStatus.getSnapshot,
    );
    const {data, isLoading} = useLiveQuery(
        q => q
            .from({scripts: scriptsCollection})
            .orderBy(({scripts}) => scripts.updatedAt, 'desc')
            .limit(limit),
        [limit, scriptsCollection],
    );
    const scriptSummaries = useMemo<ScriptSummary[]>(() => data ?? [], [data]);
    const scripts = useMemo<ScriptListItem[]>(
        () => scriptSummaries.map(summary => toScriptListItem(summary)),
        [scriptSummaries],
    );
    const refresh = useCallback(
        () => repository.scriptSummaries.refresh(),
        [repository],
    );

    return {
        scripts,
        scriptSummaries,
        isLoading: !storeStatus.isReady || isLoading,
        error: storeStatus.sourceError,
        refresh,
    };
};
