import type {ScriptSummary} from '@stagistic/db';
import {
    eq,
    useLiveQuery,
} from '@tanstack/react-db';
import {
    useCallback,
    useMemo,
    useSyncExternalStore,
} from 'react';

import {toScriptListItem} from './mappers';
import {useScriptsContext} from './ScriptRepositoryProvider';
import type {
    ScriptListItem,
    ScriptSummaryState,
} from './types';

export const useScriptSummary = (scriptId?: string | null): ScriptSummaryState => {
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
        q => {
            if (!scriptId) {
                return undefined;
            }

            return q
                .from({scripts: scriptsCollection})
                .where(({scripts}) => eq(scripts.id, scriptId));
        },
        [scriptId, scriptsCollection],
    );
    const summary = useMemo<ScriptSummary | null>(() => data?.[0] ?? null, [data]);
    const script = useMemo<ScriptListItem | null>(
        () => summary ? toScriptListItem(summary) : null,
        [summary],
    );
    const refresh = useCallback(
        () => repository.scriptSummaries.refresh(),
        [repository],
    );

    return {
        script,
        summary,
        isLoading: Boolean(scriptId) && (!storeStatus.isReady || isLoading),
        error: storeStatus.sourceError,
        refresh,
    };
};
