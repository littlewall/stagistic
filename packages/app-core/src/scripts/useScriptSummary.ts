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
import type {
    ScriptListItem,
    ScriptSummaryState,
} from './types';

export const useScriptSummary = (scriptId?: string | null): ScriptSummaryState => {
    const repository = useScriptRepository();
    const [summary, setSummary] = useState<ScriptSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const requestIdRef = useRef(0);
    const loadedScriptIdRef = useRef<string | null>(null);

    const load = useCallback(async () => {
        if (!scriptId) {
            loadedScriptIdRef.current = null;
            setSummary(null);
            setIsLoading(false);
            setError(null);

            return;
        }

        const requestId = requestIdRef.current + 1;
        const isInitialLoad = loadedScriptIdRef.current !== scriptId;

        requestIdRef.current = requestId;
        setIsLoading(isInitialLoad);

        try {
            const data = await repository.getScriptSummary(scriptId);

            if (requestIdRef.current !== requestId) {
                return;
            }

            setSummary(data);
            setError(null);
        } catch (err) {
            if (requestIdRef.current !== requestId) {
                return;
            }

            setSummary(null);
            setError(err as Error);
        } finally {
            if (requestIdRef.current === requestId) {
                loadedScriptIdRef.current = scriptId;
                setIsLoading(false);
            }
        }
    }, [repository, scriptId]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        return onScriptsInvalidated(() => {
            void load();
        });
    }, [load]);

    const script = useMemo<ScriptListItem | null>(
        () => summary ? toScriptListItem(summary) : null,
        [summary],
    );

    return {
        script,
        summary,
        isLoading,
        error,
        refresh: load,
    };
};
