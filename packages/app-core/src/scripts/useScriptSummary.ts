import type {ScriptSummary} from '@stagistic/db';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {useScriptRepository} from './ScriptRepositoryProvider';
import {onScriptsInvalidated} from './scriptsEvents';

type ScriptListItem = {
    id: string,
    name: string,
};

type ScriptSummaryState = {
    script: ScriptListItem | null,
    summary: ScriptSummary | null,
    isLoading: boolean,
    error: Error | null,
    refresh: () => void,
};

export const useScriptSummary = (scriptId?: string | null): ScriptSummaryState => {
    const repository = useScriptRepository();
    const [summary, setSummary] = useState<ScriptSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const requestIdRef = useRef(0);

    const load = useCallback(async () => {
        if (!scriptId) {
            setSummary(null);
            setIsLoading(false);
            setError(null);

            return;
        }

        const requestId = requestIdRef.current + 1;

        requestIdRef.current = requestId;
        setIsLoading(true);

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
        () => summary
            ? {
                id: summary.id,
                name: summary.title,
            }
            : null,
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
