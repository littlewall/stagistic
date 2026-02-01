import {useScriptRepository, useScripts} from '@stagistic/app-core';
import {
    MENU_EVENT_IMPORT_SCRIPT,
    MENU_EVENT_NEW_SCRIPT,
} from '@stagistic/app-core';
import {type FountainDocument, serializeFountain} from '@stagistic/editor-core';
import {FountainEditor} from '@stagistic/editor-ui';
import {
    ensureNodeIds,
    ensureSceneHeading,
    isSlateValueEmpty,
    type SlateValue,
} from '@stagistic/shared';
import {
    AppHeader,
    AppLayout,
    EditorSidebar,
    NewScriptModal,
    type ScriptSyncState,
    useToastController,
} from '@stagistic/ui';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    useNavigate,
    useParams,
} from 'react-router-dom';

const AUTOSAVE_DELAY_MS = 1500;
const SAVE_SLOW_INDICATOR_MS = 600;
const DEFAULT_SCRIPT_TITLE = 'Untitled script';
const SEED_COOLDOWN_MS = 5000;

export const ScriptEditorRoute = () => {
    const navigate = useNavigate();
    const {scriptId} = useParams();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const {
        scripts,
        createScript,
        isLoading: scriptsLoading,
        error: scriptsError,
    } = useScripts();
    const [initialValue, setInitialValue] = useState<SlateValue | null | undefined>(undefined);
    const [serializedPreview, setSerializedPreview] = useState<string>('');
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

    useEffect(() => {
        const handleNewScript = () => {
            setIsModalOpen(true);
        };

        const handleImport = () => {
            addToast({
                title: 'Import is coming soon',
                description: 'We will add it in a future update.',
                variant: 'info',
            });
        };

        window.addEventListener(MENU_EVENT_NEW_SCRIPT, handleNewScript);
        window.addEventListener(MENU_EVENT_IMPORT_SCRIPT, handleImport);

        return () => {
            window.removeEventListener(MENU_EVENT_NEW_SCRIPT, handleNewScript);
            window.removeEventListener(MENU_EVENT_IMPORT_SCRIPT, handleImport);
        };
    }, [addToast]);

    const currentScript = useMemo(
        () => scripts.find(script => script.id === scriptId) ?? scripts[0],
        [scripts, scriptId],
    );
    const currentScriptId = currentScript?.id ?? null;

    const recentScripts = useMemo(
        () => currentScript
            ? scripts.filter(script => script.id !== currentScript.id).slice(0, 3)
            : [],
        [scripts, currentScript],
    );

    const scenes = useMemo(() => {
        const lines = serializedPreview.split('\n');
        const scenePattern = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s+.+/i;

        return lines
            .map((line, index) => ({line: line.trim(), lineNumber: index}))
            .filter(({line}) => scenePattern.test(line))
            .map(({line, lineNumber}, index) => ({
                id: `scene-${index}`,
                heading: line,
                lineNumber,
            }));
    }, [serializedPreview]);

    useEffect(() => {
        if (scriptsLoading) {
            return;
        }

        if (scriptsError) {
            return;
        }

        if (scripts.length === 0) {
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
                    const newScriptId = await createScript(DEFAULT_SCRIPT_TITLE);

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
            void navigate(`/script/${scripts[0].id}/editor`, {replace: true});

            return;
        }

        const exists = scripts.some(script => script.id === scriptId);

        if (!exists && scripts[0]) {
            void navigate(`/script/${scripts[0].id}/editor`, {replace: true});
        }
    }, [
        createScript,
        navigate,
        scriptId,
        scripts,
        scriptsLoading,
        scriptsError,
    ]);

    useEffect(() => {
        if (!currentScriptId) {
            return;
        }

        let isActive = true;

        setInitialValue(undefined);
        setSerializedPreview('');
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
                    const storedSerialized = JSON.stringify(stored);
                    const normalized = ensureNodeIds(ensureSceneHeading(stored));
                    const normalizedSerialized = JSON.stringify(normalized);

                    if (storedSerialized !== normalizedSerialized) {
                        void scriptRepository.saveLatest(currentScriptId, normalized).catch(error => {
                            console.error('Failed to persist script node ids', error);
                        });
                    }

                    setSerializedPreview(serializeFountain(normalized as unknown as FountainDocument));
                    setInitialValue(normalized);
                    setShouldAutoFocus(needsFocus);

                    return;
                }

                const fallback = ensureNodeIds(ensureSceneHeading(null));

                setInitialValue(fallback);
                setSerializedPreview(serializeFountain(fallback as unknown as FountainDocument));
                setShouldAutoFocus(true);
            } catch (error) {
                console.error('Failed to load latest script', error);
                setStorageError('Failed to load script data.');

                const fallback = ensureNodeIds(ensureSceneHeading(null));

                setInitialValue(fallback);
                setSerializedPreview('');
                setShouldAutoFocus(true);
            }
        };

        void loadLatest();

        return () => {
            isActive = false;
        };
    }, [currentScriptId]);

    const handleValueChange = useCallback(
        (value: SlateValue) => {
            setSerializedPreview(serializeFountain(value as unknown as FountainDocument));
        },
        [setSerializedPreview, serializeFountain],
    );

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
    const handleSelectScript = useCallback((script: {id: string}) => {
        void navigate(`/script/${script.id}/editor`);
    }, [navigate]);
    const handleHome = useCallback(() => {
        void navigate('/');
    }, [navigate]);
    const handleNewScript = useCallback(() => {
        setIsModalOpen(true);
    }, []);
    const handleMenuAction = useCallback((actionId: string) => {
        if (actionId === 'scripts') {
            void navigate('/script/list');

            return;
        }

        if (actionId === 'settings' && currentScript) {
            void navigate(`/script/${currentScript.id}/settings`);

            return;
        }

        if (actionId === 'new-script') {
            setIsModalOpen(true);
        }
    }, [currentScript, navigate]);
    const handleSceneClick = useCallback(() => {}, []);
    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
    }, []);
    const handleCreate = useCallback((name: string) => {
        const createAndNavigate = async () => {
            try {
                const newScriptId = await createScript(name);

                setIsModalOpen(false);
                void navigate(`/script/${newScriptId}/editor`);
                addToast({
                    title: 'Script created',
                    description: name.trim() || 'Untitled script',
                    variant: 'success',
                });
            } catch (error) {
                console.error('Failed to create script', error);
                setStorageError('Failed to create script.');
                addToast({
                    title: 'Failed to create script',
                    description: 'Please try again.',
                    variant: 'error',
                });
            }
        };

        void createAndNavigate();
    }, [
        addToast,
        createScript,
        navigate,
    ]);

    if (scriptsLoading || initialValue === undefined) {
        return null;
    }

    if (!currentScript) {
        return null;
    }

    return (
        <AppLayout
            header={(
                <AppHeader
                    currentScript={currentScript}
                    recentScripts={recentScripts}
                    onSelectScript={handleSelectScript}
                    onHome={handleHome}
                    onNewScript={handleNewScript}
                    scriptSyncState={saveIndicator}
                    onMenuAction={handleMenuAction}
                />
            )}
            sidebar={<EditorSidebar scenes={scenes} onSceneClick={handleSceneClick} />}
        >
            {storageError ? (
                <div role="alert" style={{padding: '12px 20px'}}>
                    {storageError}
                </div>
            ) : null}
            <FountainEditor
                initialValue={initialValue ?? undefined}
                onAutoSave={handleAutoSave}
                onValueChange={handleValueChange}
                onManualSave={handleManualSave}
                autoSaveDelayMs={AUTOSAVE_DELAY_MS}
                autoFocus={shouldAutoFocus}
            />
            <NewScriptModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onCreate={handleCreate}
            />
        </AppLayout>
    );
};
