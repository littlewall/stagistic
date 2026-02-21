import {
    buildScriptBlockIndex,
    type EditorSettingsOverride,
    ensureFountainBlockIds,
    ensureSceneHeading,
    ensureScriptStructure,
    isScriptDocumentEmpty,
    type ScriptBlockIndexSnapshot,
    type ScriptDocument,
} from '@stagistic/script-core';
import {
    useEffect,
    useState,
} from 'react';

import {EDITOR_SETTINGS_NAMESPACE} from './constants';

type ScriptLoaderResult = {
    initialValue: ScriptDocument | null | undefined,
    initialIndexSnapshot: ScriptBlockIndexSnapshot | null | undefined,
    scriptSettingsOverride: EditorSettingsOverride | null | undefined,
    storageError: string | null,
    shouldAutoFocus: boolean,
    setScriptSettingsOverride: (value: EditorSettingsOverride | null) => void,
    setStorageError: (value: string | null) => void,
};

type ScriptLoaderRepository = {
    loadLatest: (scriptId: string) => Promise<ScriptDocument | null>,
    loadScriptConfig: (scriptId: string, namespace: string) => Promise<EditorSettingsOverride | null>,
    getScriptBlockIndex: (scriptId: string) => Promise<ScriptBlockIndexSnapshot | null>,
    ensureScriptBlockIndex: (scriptId: string) => Promise<void>,
};

export const useScriptLoader = (
    currentScriptId: string | null,
    scriptRepository: ScriptLoaderRepository,
): ScriptLoaderResult => {
    const [initialValue, setInitialValue] = useState<ScriptDocument | null | undefined>(undefined);
    const [initialIndexSnapshot, setInitialIndexSnapshot] = useState<ScriptBlockIndexSnapshot | null | undefined>(undefined);
    const [scriptSettingsOverride, setScriptSettingsOverrideState] = useState<EditorSettingsOverride | null | undefined>(
        undefined,
    );
    const [storageError, setStorageErrorState] = useState<string | null>(null);
    const [shouldAutoFocus, setShouldAutoFocus] = useState(false);

    useEffect(() => {
        if (!currentScriptId) {
            return;
        }

        let isActive = true;

        setInitialValue(undefined);
        setInitialIndexSnapshot(undefined);
        setScriptSettingsOverrideState(undefined);
        setShouldAutoFocus(false);

        const loadLatest = async () => {
            try {
                const loadLatestPromise = scriptRepository.loadLatest(currentScriptId);
                const loadSettingsPromise = scriptRepository.loadScriptConfig(
                    currentScriptId,
                    EDITOR_SETTINGS_NAMESPACE,
                );
                const loadIndexPromise = scriptRepository.getScriptBlockIndex(currentScriptId);
                const [stored, storedSettings, storedIndex] = await Promise.all([
                    loadLatestPromise,
                    loadSettingsPromise,
                    loadIndexPromise,
                ]);

                if (!isActive) {
                    return;
                }

                setStorageErrorState(null);
                setScriptSettingsOverrideState(storedSettings);
                setInitialIndexSnapshot(storedIndex);

                if (stored) {
                    const needsFocus = isScriptDocumentEmpty(stored);
                    const withIds = ensureFountainBlockIds(stored);
                    const withScene = ensureSceneHeading(withIds);
                    const normalized = ensureScriptStructure(withScene);
                    const fallbackIndex = buildScriptBlockIndex(normalized).snapshot;

                    setInitialValue(normalized);
                    setInitialIndexSnapshot(storedIndex ?? fallbackIndex);
                    setShouldAutoFocus(needsFocus);
                } else {
                    const fallback = ensureSceneHeading(null);
                    const normalizedFallback = ensureScriptStructure(fallback);

                    setInitialValue(normalizedFallback);
                    setInitialIndexSnapshot(storedIndex ?? buildScriptBlockIndex(normalizedFallback).snapshot);
                    setScriptSettingsOverrideState(null);
                    setShouldAutoFocus(true);
                }

                if (stored) {
                    void scriptRepository
                        .ensureScriptBlockIndex(currentScriptId)
                        .then(() => scriptRepository.getScriptBlockIndex(currentScriptId))
                        .then(ensuredIndex => {
                            if (!isActive || !ensuredIndex) {
                                return;
                            }

                            setInitialIndexSnapshot(ensuredIndex);
                        })
                        .catch(error => {
                            console.error('Failed to ensure script block index', error);
                        });
                }
            } catch (error) {
                console.error('Failed to load latest script', error);
                setStorageErrorState('Failed to load script data.');

                const fallback = ensureSceneHeading(null);
                const normalizedFallback = ensureScriptStructure(fallback);

                setInitialValue(normalizedFallback);
                setInitialIndexSnapshot(buildScriptBlockIndex(normalizedFallback).snapshot);
                setScriptSettingsOverrideState(null);
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
        scriptSettingsOverride,
        storageError,
        shouldAutoFocus,
        setScriptSettingsOverride: value => setScriptSettingsOverrideState(value),
        setStorageError: value => setStorageErrorState(value),
    };
};
