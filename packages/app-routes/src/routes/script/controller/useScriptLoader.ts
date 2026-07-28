import {
    buildScriptBlockIndex,
    coerceUnknownBlocksToStageDirections,
    ensureSceneHeading,
    ensureScriptBlockIds,
    ensureScriptStructure,
    isScriptDocumentEmpty,
    type ScriptBlockIndexSnapshot,
    type ScriptDocument,
} from '@stagistic/script';
import {
    useEffect,
    useState,
} from 'react';

type ScriptLoaderResult = {
    initialValue: ScriptDocument | null | undefined,
    initialIndexSnapshot: ScriptBlockIndexSnapshot | null | undefined,
    storageError: string | null,
    shouldAutoFocus: boolean,
    setStorageError: (value: string | null) => void,
};

type ScriptLoaderRepository = {
    loadLatest: (scriptId: string) => Promise<ScriptDocument | null>,
    saveLatest: (scriptId: string, value: ScriptDocument) => Promise<unknown>,
};

export const useScriptLoader = (
    currentScriptId: string | null,
    scriptRepository: ScriptLoaderRepository,
): ScriptLoaderResult => {
    const [initialValue, setInitialValue] = useState<ScriptDocument | null | undefined>(undefined);
    const [initialIndexSnapshot, setInitialIndexSnapshot] = useState<ScriptBlockIndexSnapshot | null | undefined>(undefined);
    const [storageError, setStorageErrorState] = useState<string | null>(null);
    const [shouldAutoFocus, setShouldAutoFocus] = useState(false);

    useEffect(() => {
        if (!currentScriptId) {
            return;
        }

        let isActive = true;

        setInitialValue(undefined);
        setInitialIndexSnapshot(undefined);
        setShouldAutoFocus(false);

        const loadLatest = async () => {
            try {
                const stored = await scriptRepository.loadLatest(currentScriptId);

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

                const needsFocus = isScriptDocumentEmpty(stored);

                const coerced = coerceUnknownBlocksToStageDirections(stored);

                if (coerced.changed) {
                    await scriptRepository.saveLatest(currentScriptId, coerced.value);
                }

                const withIds = ensureScriptBlockIds(coerced.value);
                const withScene = ensureSceneHeading(withIds);
                const normalized = ensureScriptStructure(withScene);
                const fallbackIndex = buildScriptBlockIndex(normalized).snapshot;

                setInitialValue(normalized);
                setInitialIndexSnapshot(fallbackIndex);
                setShouldAutoFocus(needsFocus);
            } catch {
                console.error('Failed to load latest script');
                setStorageErrorState('Failed to load script data.');

                const fallback = ensureSceneHeading(null);
                const normalizedFallback = ensureScriptStructure(fallback);

                setInitialValue(normalizedFallback);
                setInitialIndexSnapshot(buildScriptBlockIndex(normalizedFallback).snapshot);
                setShouldAutoFocus(true);
            }
        };

        void loadLatest();

        return () => {
            isActive = false;
        };
    }, [currentScriptId, scriptRepository]);

    return {
        initialValue,
        initialIndexSnapshot,
        storageError,
        shouldAutoFocus,
        setStorageError: value => setStorageErrorState(value),
    };
};
