import {
    useRecentScripts,
    useScriptRepository,
    useScriptSummary,
} from '@stagistic/app-core';
import {
    type EditorSettingsOverride,
    type ScriptDocument,
} from '@stagistic/script-core';
import {useToastController} from '@stagistic/ui';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
} from 'react';
import {useNavigate} from 'react-router-dom';

import {
    isEditorSettingsOverrideEmpty,
    type ScriptEditorController,
} from './controller/types';
import {useEditorRedirects} from './controller/useEditorRedirects';
import {useSaveIndicator} from './controller/useSaveIndicator';
import {useScriptLoader} from './controller/useScriptLoader';
import {useSeedDefaultScript} from './controller/useSeedDefaultScript';

const EDITOR_SETTINGS_NAMESPACE = 'editor';

type EditorLoadItemStatus = 'error' | 'active' | 'done' | 'pending';

const resolveEditorLoadItemStatus = ({
    hasError,
    isActive,
    isDone,
    fallback = 'pending',
}: {
    hasError: boolean,
    isActive: boolean,
    isDone: boolean,
    fallback?: EditorLoadItemStatus,
}): EditorLoadItemStatus => {
    if (hasError) {
        return 'error';
    }

    if (isActive) {
        return 'active';
    }

    if (isDone) {
        return 'done';
    }

    return fallback;
};

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
        scriptSettingsOverride,
        storageError,
        shouldAutoFocus,
        setScriptSettingsOverride,
        setStorageError,
    } = useScriptLoader(currentScript?.id ?? null, scriptRepository);
    const {
        saveIndicator, startSaveIndicator, finishSaveIndicator,
    } = useSaveIndicator();
    const {addToast} = useToastController();
    const settingsSaveRequestRef = useRef(0);

    const scriptsLoading = recentScriptsLoading || (scriptId ? currentScriptLoading : false);
    const scriptsError = currentScriptError ?? recentScriptsError;
    const currentScriptId = currentScript?.id ?? null;
    const isContentLoading = !!currentScriptId
        && (initialValue === undefined || scriptSettingsOverride === undefined);

    const seedDefaultScript = useSeedDefaultScript(
        scriptRepository,
        refreshRecentScripts,
        navigate,
        addToast,
        setStorageError,
    );

    useEditorRedirects({
        scriptsLoading,
        scriptsError,
        recentScriptsData,
        currentScript,
        scriptId,
        navigate,
        seedDefaultScript,
    });

    const editorLoadState = useMemo(() => {
        const items = [
            {
                label: 'Načítám seznam scénářů',
                status: resolveEditorLoadItemStatus({
                    hasError: Boolean(recentScriptsError),
                    isActive: recentScriptsLoading,
                    isDone: true,
                }),
            },
            {
                label: 'Načítám metadata scénáře',
                status: resolveEditorLoadItemStatus({
                    hasError: Boolean(currentScriptError),
                    isActive: currentScriptLoading,
                    isDone: Boolean(scriptId),
                }),
            },
            {
                label: 'Načítám obsah scénáře',
                status: resolveEditorLoadItemStatus({
                    hasError: Boolean(storageError),
                    isActive: isContentLoading,
                    isDone: Boolean(initialValue),
                }),
            },
            {
                label: 'Načítám editor settings',
                status: resolveEditorLoadItemStatus({
                    hasError: Boolean(storageError),
                    isActive: scriptSettingsOverride === undefined,
                    isDone: true,
                }),
            },
        ] as const;

        const score = (status: typeof items[number]['status']) => {
            if (status === 'done') {
                return 1;
            }

            if (status === 'active') {
                return 0.5;
            }

            return 0;
        };
        const progress = items.reduce((sum, item) => sum + score(item.status), 0) / items.length;
        const statusText = items.find(item => item.status === 'active')?.label
            ?? items.find(item => item.status === 'error')?.label
            ?? 'Připravuji editor';

        return {
            progress,
            statusText,
            isLoading: scriptsLoading || isContentLoading,
        };
    }, [
        currentScriptError,
        currentScriptLoading,
        initialValue,
        isContentLoading,
        recentScriptsError,
        recentScriptsLoading,
        scriptId,
        scriptsLoading,
        scriptSettingsOverride,
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
    ]);

    return {
        scriptsLoading,
        scriptsError,
        currentScript,
        currentScriptId,
        recentScripts,
        initialValue,
        scriptSettingsOverride,
        storageError,
        shouldAutoFocus,
        saveIndicator,
        editorLoadState,
        handleAutoSave,
        handleManualSave,
        handleSaveScriptSettingsOverride,
    };
};
