import {
    useRecentScripts,
    useScriptRepository,
    useScriptSummary,
} from '@stagistic/app-core';
import {
    type EditorSettingsOverride,
    ensureFountainBlockIds,
    ensureSceneHeading,
    getFirstBlockId,
    isScriptDocumentEmpty,
    type ScriptDocument,
} from '@stagistic/shared';
import {type ScriptSyncState, useToastController} from '@stagistic/ui';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {useNavigate} from 'react-router-dom';

const SAVE_SLOW_INDICATOR_MS = 600;
const DEFAULT_SCRIPT_TITLE = 'Untitled script';
const SEED_COOLDOWN_MS = 5000;
const EDITOR_SETTINGS_NAMESPACE = 'editor';

const isEditorSettingsOverrideEmpty = (value?: EditorSettingsOverride | null) => {
    if (!value) {
        return true;
    }

    const hasPage = Boolean(value.page && Object.keys(value.page).length > 0);
    const hasTypography = Boolean(value.typography && Object.keys(value.typography).length > 0);
    const hasBlocks = Boolean(value.blocks && Object.keys(value.blocks).length > 0);

    return !(hasPage || hasTypography || hasBlocks);
};

type ScriptEditorController = {
    scriptsLoading: boolean,
    scriptsError: unknown,
    currentScript: {id: string, name: string} | null,
    currentScriptId: string | null,
    recentScripts: {id: string, name: string}[],
    initialValue: ScriptDocument | null | undefined,
    scriptSettingsOverride: EditorSettingsOverride | null | undefined,
    storageError: string | null,
    shouldAutoFocus: boolean,
    saveIndicator: ScriptSyncState,
    editorLoadState: {
        progress: number,
        statusText: string,
        isLoading: boolean,
    },
    handleAutoSave: (value: ScriptDocument) => Promise<boolean>,
    handleManualSave: (value: ScriptDocument) => Promise<boolean>,
    handleSaveScriptSettingsOverride: (settings?: EditorSettingsOverride) => Promise<boolean>,
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
    const [initialValue, setInitialValue] = useState<ScriptDocument | null | undefined>(undefined);
    const [scriptSettingsOverride, setScriptSettingsOverride] = useState<EditorSettingsOverride | null | undefined>(
        undefined,
    );
    const [storageError, setStorageError] = useState<string | null>(null);
    const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
    const [saveIndicator, setSaveIndicator] = useState<ScriptSyncState>('saved');
    const pendingSaveRef = useRef(0);
    const settingsSaveRequestRef = useRef(0);
    const slowSaveTimerRef = useRef<number | null>(null);
    const seedStateRef = useRef({
        pending: false,
        lastAttempt: 0,
        seeded: false,
    });
    const {addToast} = useToastController();
    const scriptRepository = useScriptRepository();

    const startSaveIndicator = useCallback(() => {
        pendingSaveRef.current += 1;

        if (slowSaveTimerRef.current) {
            window.clearTimeout(slowSaveTimerRef.current);
        }

        slowSaveTimerRef.current = window.setTimeout(() => {
            if (pendingSaveRef.current > 0) {
                setSaveIndicator('saving');
            }
        }, SAVE_SLOW_INDICATOR_MS);
    }, []);

    const finishSaveIndicator = useCallback((success: boolean) => {
        if (!success) {
            setSaveIndicator('error');
        }

        pendingSaveRef.current = Math.max(0, pendingSaveRef.current - 1);

        if (pendingSaveRef.current === 0) {
            if (slowSaveTimerRef.current) {
                window.clearTimeout(slowSaveTimerRef.current);
                slowSaveTimerRef.current = null;
            }

            setSaveIndicator(success ? 'saved' : 'error');
        }
    }, []);

    useEffect(() => {
        return () => {
            if (slowSaveTimerRef.current) {
                window.clearTimeout(slowSaveTimerRef.current);
            }
        };
    }, []);

    const scriptsLoading = recentScriptsLoading || (scriptId ? currentScriptLoading : false);
    const scriptsError = currentScriptError ?? recentScriptsError;
    const currentScriptId = currentScript?.id ?? null;
    const isContentLoading = !!currentScriptId
        && (initialValue === undefined || scriptSettingsOverride === undefined);
    const editorLoadState = useMemo(() => {
        const items = [
            {
                label: 'Načítám seznam scénářů',
                status: recentScriptsError
                    ? 'error'
                    : recentScriptsLoading
                        ? 'active'
                        : 'done',
            },
            {
                label: 'Načítám metadata scénáře',
                status: currentScriptError
                    ? 'error'
                    : currentScriptLoading
                        ? 'active'
                        : scriptId
                            ? 'done'
                            : 'pending',
            },
            {
                label: 'Načítám obsah scénáře',
                status: storageError
                    ? 'error'
                    : isContentLoading
                        ? 'active'
                        : initialValue
                            ? 'done'
                            : 'pending',
            },
            {
                label: 'Načítám editor settings',
                status: storageError
                    ? 'error'
                    : scriptSettingsOverride === undefined
                        ? 'active'
                        : 'done',
            },
        ] as const;

        const score = (status: typeof items[number]['status']) => {
            if (status === 'done') return 1;

            if (status === 'active') return 0.5;

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

    useEffect(() => {
        if (scriptsLoading) {
            return;
        }

        if (scriptsError) {
            return;
        }

        if (recentScriptsData.length === 0 && !currentScript) {
            const seedDefault = async () => {
                const now = Date.now();

                if (seedStateRef.current.seeded || seedStateRef.current.pending) {
                    return;
                }

                if (now - seedStateRef.current.lastAttempt < SEED_COOLDOWN_MS) {
                    return;
                }

                seedStateRef.current.lastAttempt = now;
                seedStateRef.current.pending = true;

                try {
                    const seedValue = ensureFountainBlockIds(ensureSceneHeading(null));
                    const newScriptId = await scriptRepository.createScript(DEFAULT_SCRIPT_TITLE, seedValue);
                    const activeBlockId = getFirstBlockId(seedValue);

                    if (activeBlockId) {
                        await scriptRepository.setActiveBlock(newScriptId, activeBlockId);
                    }

                    void refreshRecentScripts();

                    seedStateRef.current.seeded = true;
                    void navigate(`/script/${newScriptId}/editor`, {replace: true});
                } catch (error) {
                    console.error('Failed to seed default script', error);
                    setStorageError('Failed to initialize local storage.');
                    addToast({
                        title: 'Failed to initialize storage',
                        description: 'Please restart the app.',
                        variant: 'error',
                    });
                } finally {
                    seedStateRef.current.pending = false;
                }
            };

            void seedDefault();

            return;
        }

        if (!scriptId) {
            if (recentScriptsData[0]) {
                void navigate(`/script/${recentScriptsData[0].id}/editor`, {replace: true});
            }

            return;
        }

        if (!currentScript && recentScriptsData[0]) {
            void navigate(`/script/${recentScriptsData[0].id}/editor`, {replace: true});
        }
    }, [
        addToast,
        currentScript,
        navigate,
        recentScriptsData,
        refreshRecentScripts,
        scriptsLoading,
        scriptsError,
        scriptId,
        scriptRepository,
    ]);

    useEffect(() => {
        if (!currentScriptId) {
            return;
        }

        let isActive = true;

        setInitialValue(undefined);
        setScriptSettingsOverride(undefined);
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

                setStorageError(null);
                setScriptSettingsOverride(storedSettings);

                if (stored) {
                    const needsFocus = isScriptDocumentEmpty(stored);
                    // Ensure IDs and scene heading
                    const withIds = ensureFountainBlockIds(stored);
                    const normalized = ensureSceneHeading(withIds);

                    setInitialValue(normalized);
                    setShouldAutoFocus(needsFocus);

                    return;
                }

                const fallback = ensureSceneHeading(null);

                setInitialValue(fallback);
                setScriptSettingsOverride(null);
                setShouldAutoFocus(true);
            } catch (error) {
                console.error('Failed to load latest script', error);
                setStorageError('Failed to load script data.');

                const fallback = ensureSceneHeading(null);

                setInitialValue(fallback);
                setScriptSettingsOverride(null);
                setShouldAutoFocus(true);
            }
        };

        void loadLatest();

        return () => {
            isActive = false;
        };
    }, [currentScriptId, scriptRepository]);

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
