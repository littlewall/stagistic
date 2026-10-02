import type {
    EditorSettingsOverride,
    ScriptDocument,
    ScriptSummaryMetadata,
} from '@stagistic/script';
import {useCallback} from 'react';

import type {
    AppToastPayload,
    CurrentScriptItem,
} from './types';

interface SaveIndicatorControls {
    startSaveIndicator: () => void,
    finishSaveIndicator: (didSave: boolean) => void,
}

interface SaveRepository {
    saveLatest: (
        scriptId: string,
        value: ScriptDocument,
        metadata?: ScriptSummaryMetadata,
        expectedSettings?: EditorSettingsOverride | null,
    ) => Promise<unknown>,
    saveSummaryMetadata: (
        scriptId: string,
        value: ScriptDocument,
        metadata: ScriptSummaryMetadata,
        expectedSettings?: EditorSettingsOverride | null,
    ) => Promise<boolean>,
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
    const {saveIndicatorControls} = state;
    const {startSaveIndicator, finishSaveIndicator} = saveIndicatorControls;

    const handleAutoSave = useCallback(async (value: ScriptDocument, metadata?: ScriptSummaryMetadata, expectedSettings?: EditorSettingsOverride | null) => {
        if (!currentScriptId) {
            return false;
        }

        try {
            startSaveIndicator();
            await scriptRepository.saveLatest(currentScriptId, value, metadata, expectedSettings);
            finishSaveIndicator(true);

            return true;
        } catch {
            console.error('Failed to save latest script');
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

    const handleManualSave = useCallback(async (value: ScriptDocument, metadata?: ScriptSummaryMetadata, expectedSettings?: EditorSettingsOverride | null) => {
        if (!currentScript || !currentScriptId) {
            return false;
        }

        try {
            startSaveIndicator();
            await scriptRepository.saveLatest(currentScriptId, value, metadata, expectedSettings);
            addToast({
                title: 'Script saved',
                description: currentScript.name,
                variant: 'success',
            });
            finishSaveIndicator(true);

            return true;
        } catch {
            console.error('Failed to save script');
            setStorageError('Failed to save script data.');
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

    const handleSummaryMetadataChange = useCallback(async (
        value: ScriptDocument,
        metadata: ScriptSummaryMetadata,
        expectedSettings?: EditorSettingsOverride | null,
    ) => {
        if (!currentScriptId) {
            return false;
        }

        try {
            return await scriptRepository.saveSummaryMetadata(currentScriptId, value, metadata, expectedSettings);
        } catch {
            setStorageError('Failed to save script metadata.');

            return false;
        }
    }, [
        currentScriptId,
        scriptRepository,
        setStorageError,
    ]);

    return {
        handleAutoSave,
        handleManualSave,
        handleSummaryMetadataChange,
    };
};
