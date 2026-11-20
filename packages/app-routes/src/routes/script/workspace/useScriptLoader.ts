import {
    buildScriptBlockIndex,
    coerceUnknownBlocksToStageDirections,
    ensureSceneHeading,
    ensureScriptBlockIds,
    ensureScriptStructure,
    type ScriptBlockIndexSnapshot,
    type ScriptDocument,
} from '@stagistic/script';
import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {shouldAutoFocusInitialScript} from './initialScriptFocus';

/** Pauses between load attempts; together longer than another tab takes to take over the database. */
const LOAD_RETRY_DELAYS_MS = [
    250,
    500,
    1000,
    2000,
    4000,
];

/*
 * On the web the database runs in one tab; when that tab closes, another takes
 * over, and reads under way meanwhile fail. A later read gets an answer, so a
 * failed load is tried again before the editor falls back to an empty script.
 */
const loadWithRetry = async (
    load: () => Promise<ScriptDocument | null>,
    isActive: () => boolean,
    retryDelaysMs: readonly number[],
) => {
    for (let attempt = 0; ; attempt += 1) {
        try {
            return await load();
        } catch (error) {
            if (attempt >= retryDelaysMs.length || !isActive()) {
                throw error;
            }

            await new Promise(resolve => setTimeout(resolve, retryDelaysMs[attempt]));
        }
    }
};

type ScriptLoaderResult = {
    initialValue: ScriptDocument | null | undefined,
    initialIndexSnapshot: ScriptBlockIndexSnapshot | null | undefined,
    storageError: string | null,
    shouldAutoFocus: boolean,
    setStorageError: (value: string | null) => void,
    /** Loads the script again after a failed load. */
    retryLoad: () => void,
};

type ScriptLoaderRepository = {
    loadLatest: (scriptId: string) => Promise<ScriptDocument | null>,
    saveLatest: (scriptId: string, value: ScriptDocument) => Promise<unknown>,
};

export const useScriptLoader = (
    currentScriptId: string | null,
    scriptRepository: ScriptLoaderRepository,
    {isReadOnly = false, retryDelaysMs = LOAD_RETRY_DELAYS_MS}: {isReadOnly?: boolean, retryDelaysMs?: readonly number[]} = {},
): ScriptLoaderResult => {
    const [initialValue, setInitialValue] = useState<ScriptDocument | null | undefined>(undefined);
    const [initialIndexSnapshot, setInitialIndexSnapshot] = useState<ScriptBlockIndexSnapshot | null | undefined>(undefined);
    const [storageError, setStorageErrorState] = useState<string | null>(null);
    const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
    const [attempt, setAttempt] = useState(0);

    const loadRequest = useMemo(() => ({
        scriptId: currentScriptId,
        repository: scriptRepository,
        readOnly: isReadOnly,
        retryDelays: retryDelaysMs,
        attempt,
    }), [
        attempt,
        currentScriptId,
        isReadOnly,
        retryDelaysMs,
        scriptRepository,
    ]);
    const [previousRequest, setPreviousRequest] = useState(loadRequest);

    if (previousRequest !== loadRequest) {
        setPreviousRequest(loadRequest);
        setInitialValue(undefined);
        setInitialIndexSnapshot(undefined);
        setShouldAutoFocus(false);
        setStorageErrorState(null);
    }

    useEffect(() => {
        const {
            scriptId,
            repository,
            readOnly,
            retryDelays,
        } = loadRequest;

        if (!scriptId) {
            return;
        }

        let isActive = true;

        const loadLatest = async () => {
            try {
                const stored = await loadWithRetry(() => repository.loadLatest(scriptId), () => isActive, retryDelays);

                if (!isActive) {
                    return;
                }

                setStorageErrorState(null);

                if (!stored) {
                    const fallback = ensureSceneHeading(null);
                    const normalizedFallback = ensureScriptStructure(fallback);

                    setInitialValue(normalizedFallback);
                    setInitialIndexSnapshot(buildScriptBlockIndex(normalizedFallback).snapshot);
                    setShouldAutoFocus(true);

                    return;
                }

                const needsFocus = shouldAutoFocusInitialScript(stored);

                const coerced = coerceUnknownBlocksToStageDirections(stored);

                if (coerced.changed && !readOnly) {
                    await repository.saveLatest(scriptId, coerced.value);
                }

                if (!isActive) {
                    return;
                }

                const withIds = ensureScriptBlockIds(coerced.value);
                const withScene = ensureSceneHeading(withIds);
                const normalized = ensureScriptStructure(withScene);
                const fallbackIndex = buildScriptBlockIndex(normalized).snapshot;

                setInitialValue(normalized);
                setInitialIndexSnapshot(fallbackIndex);
                setShouldAutoFocus(needsFocus);
            } catch (error) {
                if (!isActive) {
                    return;
                }

                console.error('Failed to load latest script', error);
                setStorageErrorState('Failed to load script data.');

                /*
                 * No fallback document: an empty editable script would save over the stored text.
                 * The script stays unopened until Try again loads it.
                 */
                setInitialValue(null);
                setInitialIndexSnapshot(null);
                setShouldAutoFocus(false);
            }
        };

        void loadLatest();

        return () => {
            isActive = false;
        };
    }, [loadRequest]);

    return {
        initialValue,
        initialIndexSnapshot,
        storageError,
        shouldAutoFocus,
        setStorageError: value => setStorageErrorState(value),
        retryLoad: () => setAttempt(value => value + 1),
    };
};
