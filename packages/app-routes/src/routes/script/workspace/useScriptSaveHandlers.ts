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
        /** False once this tab may no longer write the script text (another tab edits it). */
        canSave?: () => boolean,
    },
    repository: SaveRepository,
    notifications: {
        setStorageError: (value: string | null) => void,
        addToast: (payload: AppToastPayload) => void,
        /** A save was refused because the script changed elsewhere since it was loaded here. */
        onSaveRefused?: () => boolean,
    },
    state: {
        saveIndicatorControls: SaveIndicatorControls,
    },
}

const isRefusal = (error: unknown) => error instanceof Error && error.name === 'ScriptRevisionConflictError';

export const useScriptSaveHandlers = ({
    context,
    repository,
    notifications,
    state,
}: UseScriptSaveHandlersArgs) => {
    const {
        currentScript,
        currentScriptId,
        canSave,
    } = context;
    const scriptRepository = repository;
    const {
        setStorageError,
        addToast,
        onSaveRefused,
    } = notifications;
    const {saveIndicatorControls} = state;
    const {startSaveIndicator, finishSaveIndicator} = saveIndicatorControls;

    const handleAutoSave = useCallback(async (value: ScriptDocument, metadata?: ScriptSummaryMetadata, expectedSettings?: EditorSettingsOverride | null) => {
        if (!currentScriptId || canSave?.() === false) {
            return false;
        }

        try {
            startSaveIndicator();
            await scriptRepository.saveLatest(currentScriptId, value, metadata, expectedSettings);
            finishSaveIndicator(true);

            return true;
        } catch (error) {
            if (isRefusal(error) && onSaveRefused?.()) {
                finishSaveIndicator(false);

                return false;
            }

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
        canSave,
        currentScriptId,
        finishSaveIndicator,
        onSaveRefused,
        scriptRepository,
        setStorageError,
        startSaveIndicator,
    ]);

    const handleManualSave = useCallback(async (value: ScriptDocument, metadata?: ScriptSummaryMetadata, expectedSettings?: EditorSettingsOverride | null) => {
        if (!currentScript || !currentScriptId || canSave?.() === false) {
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
        } catch (error) {
            if (isRefusal(error) && onSaveRefused?.()) {
                finishSaveIndicator(false);

                return false;
            }

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
        canSave,
        currentScript,
        currentScriptId,
        finishSaveIndicator,
        onSaveRefused,
        scriptRepository,
        setStorageError,
        startSaveIndicator,
    ]);

    const handleSaveTimedOut = useCallback(() => {
        console.error('A save did not finish in time');
        setStorageError('Failed to save script data.');
        addToast({
            title: 'Failed to save',
            description: 'Changes were not saved.',
            variant: 'error',
        });
        finishSaveIndicator(false);
    }, [
        addToast,
        finishSaveIndicator,
        setStorageError,
    ]);

    const handleSummaryMetadataChange = useCallback(async (
        value: ScriptDocument,
        metadata: ScriptSummaryMetadata,
        expectedSettings?: EditorSettingsOverride | null,
    ) => {
        if (!currentScriptId || canSave?.() === false) {
            return false;
        }

        try {
            return await scriptRepository.saveSummaryMetadata(currentScriptId, value, metadata, expectedSettings);
        } catch {
            setStorageError('Failed to save script metadata.');

            return false;
        }
    }, [
        canSave,
        currentScriptId,
        scriptRepository,
        setStorageError,
    ]);

    return {
        handleAutoSave,
        handleManualSave,
        handleSaveTimedOut,
        handleSummaryMetadataChange,
    };
};
