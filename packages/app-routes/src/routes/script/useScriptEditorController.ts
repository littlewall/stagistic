import {
    useRecentScripts,
    useScriptActions,
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

import {deriveEditorLoadState} from './controller/editorLoadState';
import type {ScriptEditorController} from './controller/types';
import {useEditorRedirects} from './controller/useEditorRedirects';
import {useSaveIndicator} from './controller/useSaveIndicator';
import {useScriptLoader} from './controller/useScriptLoader';
import {useScriptSaveHandlers} from './controller/useScriptSaveHandlers';
import {useSeedDefaultScript} from './controller/useSeedDefaultScript';

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
    const scriptActions = useScriptActions();
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

    const seedDefaultScript = useSeedDefaultScript(
        scriptActions,
        navigate,
        addToast,
        setStorageError,
    );

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
        requests: {
            seedDefaultScript,
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

    const recentScripts = useMemo(
        () => currentScript
            ? recentScriptsData.filter(script => script.id !== currentScript.id).slice(0, 3)
            : recentScriptsData.slice(0, 3),
        [recentScriptsData, currentScript],
    );

    const {
        handleAutoSave,
        handleManualSave,
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
        recentScripts,
        initialValue,
        initialIndexSnapshot,
        storageError,
        shouldAutoFocus,
        saveIndicator,
        editorLoadState,
        handleAutoSave,
        handleManualSave,
    };
};
