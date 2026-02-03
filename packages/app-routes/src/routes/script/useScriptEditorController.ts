import {
    useRecentScripts,
    useScriptRepository,
    useScriptSummary,
} from '@stagistic/app-core';
import {
    ensureNodeIds,
    ensureSceneHeading,
    getFirstBlockId,
    isSlateValueEmpty,
    type SlateValue,
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

type ScriptEditorController = {
    scriptsLoading: boolean,
    scriptsError: unknown,
    currentScript: {id: string, name: string} | null,
    currentScriptId: string | null,
    recentScripts: {id: string, name: string}[],
    initialValue: SlateValue | null | undefined,
    storageError: string | null,
    shouldAutoFocus: boolean,
    saveIndicator: ScriptSyncState,
    editorLoadState: {
        progress: number,
        statusText: string,
        isLoading: boolean,
    },
    handleAutoSave: (value: SlateValue) => Promise<boolean>,
    handleManualSave: (value: SlateValue) => Promise<boolean>,
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
    const [initialValue, setInitialValue] = useState<SlateValue | null | undefined>(undefined);
    const [storageError, setStorageError] = useState<string | null>(null);
    const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
    const [saveIndicator, setSaveIndicator] = useState<ScriptSyncState>('saved');
    const pendingSaveRef = useRef(0);
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
    const isContentLoading = !!currentScriptId && initialValue === undefined;
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
                    const seedValue = ensureNodeIds(ensureSceneHeading(null));
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
        setShouldAutoFocus(false);

        const loadLatest = async () => {
            try {
                const stored = await scriptRepository.loadLatest(currentScriptId);

                if (!isActive) {
                    return;
                }

                setStorageError(null);

                if (stored) {
                    const needsFocus = isSlateValueEmpty(stored);
                    // Ensure IDs and scene heading
                    const withIds = ensureNodeIds(stored);
                    const normalized = ensureSceneHeading(withIds);

                    setInitialValue(normalized);
                    setShouldAutoFocus(needsFocus);

                    return;
                }

                const fallback = ensureSceneHeading(null);

                setInitialValue(fallback);
                setShouldAutoFocus(true);
            } catch (error) {
                console.error('Failed to load latest script', error);
                setStorageError('Failed to load script data.');

                const fallback = ensureSceneHeading(null);

                setInitialValue(fallback);
                setShouldAutoFocus(true);
            }
        };

        void loadLatest();

        return () => {
            isActive = false;
        };
    }, [currentScriptId, scriptRepository]);

    const handleAutoSave = useCallback(async (value: SlateValue) => {
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

    const handleManualSave = useCallback(async (value: SlateValue) => {
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

    return {
        scriptsLoading,
        scriptsError,
        currentScript,
        currentScriptId,
        recentScripts,
        initialValue,
        storageError,
        shouldAutoFocus,
        saveIndicator,
        editorLoadState,
        handleAutoSave,
        handleManualSave,
    };
};
