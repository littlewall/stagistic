import {
    useRecentScripts,
    useScriptCharacterCatalog,
    useScriptEditingSession,
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
import {useScriptAccess} from './ScriptAccessContext';
import {useEditorRedirects} from './useEditorRedirects';
import {useSaveIndicator} from './useSaveIndicator';
import {useScriptLoader} from './useScriptLoader';
import {useScriptSaveHandlers} from './useScriptSaveHandlers';

const readOnlySave = () => Promise.resolve(true);
const ignoreSaveTimeout = () => {};

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
    const {isReadOnly} = useScriptAccess();
    const editing = useScriptEditingSession();
    // A tab that lost editing must not write the script text, not even a flush on unmount.
    const canSave = useMemo(() => editing ? () => editing.getState().role === 'editing' : undefined, [editing]);
    const onSaveRefused = useMemo(() => editing ? () => editing.markRefused() : undefined, [editing]);
    const {
        initialValue,
        initialIndexSnapshot,
        storageError,
        shouldAutoFocus,
        setStorageError,
        retryLoad,
    } = useScriptLoader(currentScript?.id ?? null, scriptRepository, {isReadOnly});
    const {
        saveIndicator,
        startSaveIndicator,
        finishSaveIndicator,
        trackSave,
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
        handleSaveTimedOut,
        handleSummaryMetadataChange,
    } = useScriptSaveHandlers({
        context: {
            currentScript,
            currentScriptId,
            canSave,
        },
        repository: scriptRepository,
        notifications: {
            setStorageError,
            addToast,
            onSaveRefused,
        },
        state: {
            saveIndicatorControls: {
                startSaveIndicator,
                finishSaveIndicator,
            },
        },
    });

    /*
     * A stored draft or version never saves; the editor still reports values,
     * so its handlers resolve as if everything were already persisted.
     */
    const saveHandlers = useMemo(() => isReadOnly
        ? {
            handleAutoSave: readOnlySave,
            handleManualSave: readOnlySave,
            handleSaveTimedOut: ignoreSaveTimeout,
            handleSummaryMetadataChange: readOnlySave,
        }
        : {
            handleAutoSave,
            handleManualSave,
            handleSaveTimedOut,
            handleSummaryMetadataChange,
        }, [
        handleAutoSave,
        handleManualSave,
        handleSaveTimedOut,
        handleSummaryMetadataChange,
        isReadOnly,
    ]);

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
        retryLoad,
        shouldAutoFocus,
        saveIndicator,
        trackSave,
        editorLoadState,
        ...saveHandlers,
    };
};
