import {
    useRecentScripts,
    useScriptCharacterCatalog,
    useScriptEditorSettingsRecord,
    useScriptMusic,
    useScriptRepository,
    useScriptSummary,
    useScriptTitlePageRecord,
} from '@stagistic/app-core';
import {useToastController} from '@stagistic/ui';
import {useMemo} from 'react';
import {useNavigate} from 'react-router-dom';

import type {ScriptEditorController} from './controllerTypes';
import {deriveEditorLoadState} from './editorLoadState';
import {useEditorRedirects} from './useEditorRedirects';
import {useSaveIndicator} from './useSaveIndicator';
import {useScriptLoader} from './useScriptLoader';
import {useScriptSaveHandlers} from './useScriptSaveHandlers';

export const useScriptEditorController = (scriptId: string | undefined): ScriptEditorController => {
    const navigate = useNavigate();
    const {
        scripts: recentScriptsData,
        isLoading: recentScriptsLoading,
        error: recentScriptsError,
    } = useRecentScripts(4);
    const {
        script: currentScript,
        isLoading: currentScriptLoading,
        error: currentScriptError,
    } = useScriptSummary(scriptId);
    const scriptRepository = useScriptRepository();
    const {
        initialValue,
        initialIndexSnapshot,
        storageError,
        shouldAutoFocus,
        setStorageError,
    } = useScriptLoader(currentScript?.id ?? null, scriptRepository);
    const {
        saveIndicator,
        startSaveIndicator,
        finishSaveIndicator,
    } = useSaveIndicator();
    const {addToast} = useToastController();

    const scriptsLoading = recentScriptsLoading || (scriptId ? currentScriptLoading : false);
    const scriptsError = currentScriptError ?? recentScriptsError;
    const currentScriptId = currentScript?.id ?? null;
    const editorSettingsRecord = useScriptEditorSettingsRecord(currentScriptId, scriptRepository);
    const titlePageRecord = useScriptTitlePageRecord(currentScriptId, scriptRepository);
    const characterCatalog = useScriptCharacterCatalog(currentScriptId, scriptRepository);
    const musicCatalog = useScriptMusic(currentScriptId, scriptRepository);
    const isContentLoading = Boolean(currentScriptId) && initialValue === undefined;
    const isEditorMetadataLoading = Boolean(currentScriptId) && (
        editorSettingsRecord.isLoading
        || titlePageRecord.isLoading
    );
    const editorMetadataError = editorSettingsRecord.error ?? titlePageRecord.error;
    const isSidebarDataLoading = characterCatalog.isLoading || musicCatalog.isLoading;
    const sidebarDataError = characterCatalog.error ?? musicCatalog.error;

    useEditorRedirects({
        state: {
            scriptsLoading,
            scriptsError,
            recentScriptsData,
            currentScript,
            scriptId,
        },
        navigation: {
            navigate,
        },
    });

    const editorLoadState = useMemo(() => {
        return deriveEditorLoadState({
            recentScriptsError,
            recentScriptsLoading,
            currentScriptError,
            currentScriptLoading,
            storageError,
            isContentLoading,
            editorMetadataError,
            isEditorMetadataLoading,
            sidebarDataError,
            isSidebarDataLoading,
            initialValueLoaded: Boolean(initialValue),
            scriptsLoading,
            scriptId,
        });
    }, [
        currentScriptError,
        currentScriptLoading,
        editorMetadataError,
        initialValue,
        isContentLoading,
        isEditorMetadataLoading,
        isSidebarDataLoading,
        recentScriptsError,
        recentScriptsLoading,
        scriptId,
        scriptsLoading,
        sidebarDataError,
        storageError,
    ]);

    const {
        handleAutoSave,
        handleManualSave,
        handleSummaryMetadataChange,
    } = useScriptSaveHandlers({
        context: {
            currentScript,
            currentScriptId,
        },
        repository: scriptRepository,
        notifications: {
            setStorageError,
            addToast,
        },
        state: {
            saveIndicatorControls: {
                startSaveIndicator,
                finishSaveIndicator,
            },
        },
    });

    return {
        scriptsLoading,
        scriptsError,
        currentScript,
        currentScriptId,
        characterCatalog,
        musicCatalog,
        initialValue,
        initialIndexSnapshot,
        storageError,
        shouldAutoFocus,
        saveIndicator,
        editorLoadState,
        handleAutoSave,
        handleManualSave,
        handleSummaryMetadataChange,
    };
};
