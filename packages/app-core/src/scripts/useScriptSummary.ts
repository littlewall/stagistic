import type {ScriptSummary} from '@stagistic/db';
import {
    eq,
    useLiveQuery,
} from '@tanstack/react-db';
import {useMemo} from 'react';

import {useReactiveCollectionStatus} from '../collections';
import {toScriptListItem} from './mappers';
import {useScriptsContext} from './ScriptRepositoryProvider';
import type {
    ScriptListItem,
    ScriptSummaryState,
} from './types';

export const useScriptSummary = (scriptId?: string | null): ScriptSummaryState => {
    const {
        scriptsCollection,
        scriptsStatus,
    } = useScriptsContext();
    const storeStatus = useReactiveCollectionStatus(scriptsStatus);
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

    return {
        script,
        summary,
        isLoading: Boolean(scriptId) && (!storeStatus.isReady || isLoading),
        error: storeStatus.sourceError,
    };
};
