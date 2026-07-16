import {
    useRecentScripts,
    useScriptRepository,
    useScriptSummary,
} from '@stagistic/app-core';
import {useToastController} from '@stagistic/ui';
import {
    useEffect,
    useMemo,
} from 'react';
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
        refresh: refreshRecentScripts,
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
    const isContentLoading = Boolean(currentScriptId) && initialValue === undefined;

    const seedDefaultScript = useSeedDefaultScript(
        scriptRepository,
        refreshRecentScripts,
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
            initialValueLoaded: Boolean(initialValue),
            scriptsLoading,
            scriptId,
        });
    }, [
        currentScriptError,
        currentScriptLoading,
        initialValue,
        isContentLoading,
        recentScriptsError,
        recentScriptsLoading,
        scriptId,
        scriptsLoading,
        storageError,
    ]);

    const recentScripts = useMemo(
        () => currentScript
            ? recentScriptsData.filter(script => script.id !== currentScript.id).slice(0, 3)
            : recentScriptsData.slice(0, 3),
        [recentScriptsData, currentScript],
    );

    useEffect(() => {
        void refreshRecentScripts();
    }, [refreshRecentScripts, scriptId]);

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
