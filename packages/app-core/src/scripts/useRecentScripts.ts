import type {ScriptSummary} from '@stagistic/db';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {toScriptListItem} from './mappers';
import {useScriptRepository} from './ScriptRepositoryProvider';
import {onScriptsInvalidated} from './scriptsEvents';
import type {RecentScriptsState, ScriptListItem} from './types';

export const useRecentScripts = (limit = 3): RecentScriptsState => {
    const repository = useScriptRepository();
    const [data, setData] = useState<ScriptSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const requestIdRef = useRef(0);

    const load = useCallback(async () => {
        const requestId = requestIdRef.current + 1;

        requestIdRef.current = requestId;
        setIsLoading(true);

        try {
            const scripts = await repository.listScripts({limit});

            if (requestIdRef.current !== requestId) {
                return;
            }

            setData(scripts);
            setError(null);
        } catch (err) {
            if (requestIdRef.current !== requestId) {
                return;
            }

            setError(err as Error);
        } finally {
            if (requestIdRef.current === requestId) {
                setIsLoading(false);
            }
        }
    }, [limit, repository]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        return onScriptsInvalidated(() => {
            void load();
        });
    }, [load]);

    const scripts = useMemo<ScriptListItem[]>(
        () => data.map(summary => toScriptListItem(summary)),
        [data],
    );

    return {
        scripts,
        scriptSummaries: data,
        isLoading,
        error,
        refresh: load,
    };
};
