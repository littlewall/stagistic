import type {ScriptSummary} from '@stagistic/db';
import {useLiveQuery} from '@tanstack/react-db';
import {useMemo} from 'react';

import {useReactiveCollectionStatus} from '../collections';
import {toScriptListItem} from './mappers';
import {useScriptsContext} from './ScriptRepositoryProvider';
import type {RecentScriptsState, ScriptListItem} from './types';

export const useRecentScripts = (limit = 3): RecentScriptsState => {
    const {
        scriptsCollection,
        scriptsStatus,
    } = useScriptsContext();
    const storeStatus = useReactiveCollectionStatus(scriptsStatus);
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

    return {
        scripts,
        scriptSummaries,
        isLoading: !storeStatus.isReady || isLoading,
        error: storeStatus.sourceError,
    };
};
