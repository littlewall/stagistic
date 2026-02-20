import type {EditorSettingsOverride, ScriptDocument} from '@stagistic/script-core';
import {useCallback} from 'react';

import type {
    AppToastPayload,
    CurrentScriptItem,
} from '../types';
import {EDITOR_SETTINGS_NAMESPACE} from './constants';
import {isEditorSettingsOverrideEmpty} from './types';

interface SaveIndicatorControls {
    startSaveIndicator: () => void,
    finishSaveIndicator: (didSave: boolean) => void,
}

interface SaveRepository {
    saveLatest: (scriptId: string, value: ScriptDocument) => Promise<unknown>,
    commitVersion: (scriptId: string) => Promise<unknown>,
    deleteScriptConfig: (scriptId: string, namespace: string) => Promise<unknown>,
    saveScriptConfig: (
        scriptId: string,
        namespace: string,
        value: EditorSettingsOverride,
    ) => Promise<unknown>,
}

interface UseScriptSaveHandlersArgs {
    context: {
        currentScript: CurrentScriptItem | null,
        currentScriptId: string | null,
    },
    repository: SaveRepository,
    notifications: {
        setStorageError: (value: string | null) => void,
        addToast: (payload: AppToastPayload) => void,
    },
    state: {
        setScriptSettingsOverride: (value: EditorSettingsOverride | null) => void,
        settingsSaveRequestRef: {current: number},
        saveIndicatorControls: SaveIndicatorControls,
    },
}

export const useScriptSaveHandlers = ({
    context,
    repository,
    notifications,
    state,
}: UseScriptSaveHandlersArgs) => {
    const {currentScript, currentScriptId} = context;
    const scriptRepository = repository;
    const {setStorageError, addToast} = notifications;
    const {
        setScriptSettingsOverride,
        settingsSaveRequestRef,
        saveIndicatorControls,
    } = state;
    const {startSaveIndicator, finishSaveIndicator} = saveIndicatorControls;

    const handleAutoSave = useCallback(async (value: ScriptDocument) => {
        if (!currentScriptId) {
            return false;
        }

        try {
            startSaveIndicator();
            await scriptRepository.saveLatest(currentScriptId, value);
            finishSaveIndicator(true);

            return true;
        } catch (error) {
            console.error('Failed to save latest script', error);
            setStorageError('Failed to save script data.');
            addToast({
                title: 'Failed to save',
                description: 'Changes were not saved.',
                variant: 'error',
            });
            finishSaveIndicator(false);

            return false;
        }
    }, [
        addToast,
        currentScriptId,
        finishSaveIndicator,
        scriptRepository,
        setStorageError,
        startSaveIndicator,
    ]);

    const handleManualSave = useCallback(async (value: ScriptDocument) => {
        if (!currentScript || !currentScriptId) {
            return false;
        }

        try {
            startSaveIndicator();
            await scriptRepository.saveLatest(currentScriptId, value);
            await scriptRepository.commitVersion(currentScriptId);
            addToast({
                title: 'Script saved',
                description: currentScript.name,
                variant: 'success',
            });
            finishSaveIndicator(true);

            return true;
        } catch (error) {
            console.error('Failed to commit script version', error);
            setStorageError('Failed to commit script version.');
            addToast({
                title: 'Failed to save',
                description: 'Please try again.',
                variant: 'error',
            });
            finishSaveIndicator(false);

            return false;
        }
    }, [
        addToast,
        currentScript,
        currentScriptId,
        finishSaveIndicator,
        scriptRepository,
        setStorageError,
        startSaveIndicator,
    ]);

    const handleSaveScriptSettingsOverride = useCallback(async (settings?: EditorSettingsOverride) => {
        if (!currentScriptId) {
            return false;
        }

        try {
            const requestId = settingsSaveRequestRef.current + 1;

            settingsSaveRequestRef.current = requestId;

            const nextSettings = settings ?? {};

            if (isEditorSettingsOverrideEmpty(nextSettings)) {
                await scriptRepository.deleteScriptConfig(currentScriptId, EDITOR_SETTINGS_NAMESPACE);

                if (requestId === settingsSaveRequestRef.current) {
                    setScriptSettingsOverride(null);
                }

                return true;
            }

            await scriptRepository.saveScriptConfig(currentScriptId, EDITOR_SETTINGS_NAMESPACE, nextSettings);

            if (requestId === settingsSaveRequestRef.current) {
                setScriptSettingsOverride(nextSettings);
            }

            return true;
        } catch (error) {
            console.error('Failed to save script settings config', error);
            addToast({
                title: 'Failed to save settings',
                description: 'Editor settings were not saved.',
                variant: 'error',
            });

            return false;
        }
    }, [
        addToast,
        currentScriptId,
        scriptRepository,
        setScriptSettingsOverride,
        settingsSaveRequestRef,
    ]);

    return {
        handleAutoSave,
        handleManualSave,
        handleSaveScriptSettingsOverride,
    };
};
