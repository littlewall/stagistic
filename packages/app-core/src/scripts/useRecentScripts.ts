import type {ScriptSummary} from '@stagistic/db';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {useScriptRepository} from './ScriptRepositoryProvider';
import {SCRIPTS_INVALIDATE_EVENT} from './scriptsEvents';

type ScriptListItem = {
    id: string,
    name: string,
};

type RecentScriptsState = {
    scripts: ScriptListItem[],
    scriptSummaries: ScriptSummary[],
    isLoading: boolean,
    error: Error | null,
    refresh: () => void,
};

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
        if (typeof window === 'undefined') {
            return;
        }

        const handleInvalidate = () => {
            void load();
        };

        window.addEventListener(SCRIPTS_INVALIDATE_EVENT, handleInvalidate);

        return () => {
            window.removeEventListener(SCRIPTS_INVALIDATE_EVENT, handleInvalidate);
        };
    }, [load]);

    const scripts = useMemo<ScriptListItem[]>(
        () => data.map(summary => ({
            id: summary.id,
            name: summary.title,
        })),
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
