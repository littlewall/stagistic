import type {
    EditorSettingsOverride,
    ScriptDocument,
    ScriptSummaryMetadata,
} from '@stagistic/script';
import type {OpenedScript} from '@stagistic/sync-engine';
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
    document?: {
        /** Bound Y.Doc replica: the engine owns the projection, saving = flushing it. */
        replica: OpenedScript | null,
        isReadOnly: boolean,
    },
}

export const useScriptSaveHandlers = ({
    context,
    repository,
    notifications,
    state,
    document: documentState,
}: UseScriptSaveHandlersArgs) => {
    const replica = documentState?.replica ?? null;
    const isReadOnly = documentState?.isReadOnly ?? false;
    const {currentScript, currentScriptId} = context;
    const scriptRepository = repository;
    const {setStorageError, addToast} = notifications;
    const {saveIndicatorControls} = state;
    const {startSaveIndicator, finishSaveIndicator} = saveIndicatorControls;

    const persist = useCallback(async (
        scriptId: string,
        value: ScriptDocument,
        metadata?: ScriptSummaryMetadata,
        expectedSettings?: EditorSettingsOverride | null,
    ) => {
        if (!replica) {
            await scriptRepository.saveLatest(scriptId, value, metadata, expectedSettings);

            return;
        }

        // The value is already in the replica; wait until the engine projected it.
        await replica.flush();

        if (metadata?.pageCount != null) {
            await scriptRepository.saveSummaryMetadata(scriptId, value, metadata, expectedSettings);
        }
    }, [replica, scriptRepository]);

    const handleAutoSave = useCallback(async (value: ScriptDocument, metadata?: ScriptSummaryMetadata, expectedSettings?: EditorSettingsOverride | null) => {
        if (!currentScriptId || isReadOnly) {
            return false;
        }

        try {
            startSaveIndicator();
            await persist(currentScriptId, value, metadata, expectedSettings);
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
        isReadOnly,
        persist,
        setStorageError,
        startSaveIndicator,
    ]);

    const handleManualSave = useCallback(async (value: ScriptDocument, metadata?: ScriptSummaryMetadata, expectedSettings?: EditorSettingsOverride | null) => {
        if (!currentScript || !currentScriptId || isReadOnly) {
            return false;
        }

        try {
            startSaveIndicator();
            await persist(currentScriptId, value, metadata, expectedSettings);
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
        isReadOnly,
        persist,
        setStorageError,
        startSaveIndicator,
    ]);

    const handleSummaryMetadataChange = useCallback(async (
        value: ScriptDocument,
        metadata: ScriptSummaryMetadata,
        expectedSettings?: EditorSettingsOverride | null,
    ) => {
        if (!currentScriptId || isReadOnly) {
            return false;
        }

        try {
            // The engine may not have projected the latest typing yet.
            await replica?.flush();

            return await scriptRepository.saveSummaryMetadata(currentScriptId, value, metadata, expectedSettings);
        } catch {
            setStorageError('Failed to save script metadata.');

            return false;
        }
    }, [
        currentScriptId,
        isReadOnly,
        replica,
        scriptRepository,
        setStorageError,
    ]);

    return {
        handleAutoSave,
        handleManualSave,
        handleSummaryMetadataChange,
    };
};
