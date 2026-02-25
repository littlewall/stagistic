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
                const [stored, storedSettings] = await Promise.all([loadLatestPromise, loadSettingsPromise]);

                if (!isActive) {
                    return;
                }

                setStorageErrorState(null);
                setScriptSettingsOverrideState(storedSettings);

                if (!stored) {
                    const fallback = ensureSceneHeading(null);
                    const normalizedFallback = ensureScriptStructure(fallback);

                    setInitialValue(normalizedFallback);
                    setInitialIndexSnapshot(buildScriptBlockIndex(normalizedFallback).snapshot);
                    setScriptSettingsOverrideState(null);
                    setShouldAutoFocus(true);

                    return;
                }

                const needsFocus = isScriptDocumentEmpty(stored);
                const withIds = ensureFountainBlockIds(stored);
                const withScene = ensureSceneHeading(withIds);
                const normalized = ensureScriptStructure(withScene);
                const fallbackIndex = buildScriptBlockIndex(normalized).snapshot;

                setInitialValue(normalized);
                setInitialIndexSnapshot(fallbackIndex);
                setShouldAutoFocus(needsFocus);
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
