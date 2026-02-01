import {useScriptRepository, useScripts} from '@stagistic/app-core';
import {
    MENU_EVENT_IMPORT_SCRIPT,
    MENU_EVENT_NEW_SCRIPT,
} from '@stagistic/app-core';
import {type FountainDocument, serializeFountain} from '@stagistic/editor-core';
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
    FountainEditor,
    NewScriptModal,
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
const DEFAULT_SCRIPT_TITLE = 'Untitled script';

const serializeValue = (value: SlateValue) => JSON.stringify(value);

export const ScriptEditorRoute = () => {
    const navigate = useNavigate();
    const {scriptId} = useParams();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const {
        scripts,
        createScript,
        isLoading: scriptsLoading,
    } = useScripts();
    const [initialValue, setInitialValue] = useState<SlateValue | null | undefined>(undefined);
    const [serializedPreview, setSerializedPreview] = useState<string>('');
    const [storageError, setStorageError] = useState<string | null>(null);
    const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
    const latestValueRef = useRef<SlateValue | null>(null);
    const lastSavedSerializedRef = useRef<string | null>(null);
    const autosaveTimerRef = useRef<number | null>(null);
    const {addToast} = useToastController();
    const scriptRepository = useScriptRepository();

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

        if (scripts.length === 0) {
            const seedDefault = async () => {
                try {
                    const newScriptId = await createScript(DEFAULT_SCRIPT_TITLE);

                    void navigate(`/script/${newScriptId}/editor`, {replace: true});
                } catch (error) {
                    console.error('Failed to seed default script', error);
                    setStorageError('Failed to initialize local storage.');
                    addToast({
                        title: 'Failed to initialize storage',
                        description: 'Please restart the app.',
                        variant: 'error',
                    });
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
    ]);

    useEffect(() => {
        if (!currentScriptId) {
            return;
        }

        let isActive = true;

        setInitialValue(undefined);
        setSerializedPreview('');
        lastSavedSerializedRef.current = null;
        latestValueRef.current = null;
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
                    const storedSerialized = serializeValue(stored);
                    const normalized = ensureNodeIds(ensureSceneHeading(stored));
                    const normalizedSerialized = serializeValue(normalized);

                    if (storedSerialized !== normalizedSerialized) {
                        void scriptRepository.saveLatest(currentScriptId, normalized).catch(error => {
                            console.error('Failed to persist script node ids', error);
                        });
                    }

                    latestValueRef.current = normalized;
                    lastSavedSerializedRef.current = normalizedSerialized;
                    setSerializedPreview(serializeFountain(normalized as unknown as FountainDocument));
                    setInitialValue(normalized);
                    setShouldAutoFocus(needsFocus);

                    return;
                }

                const fallback = ensureNodeIds(ensureSceneHeading(null));

                latestValueRef.current = fallback;
                lastSavedSerializedRef.current = serializeValue(fallback);
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
    }, [
        currentScriptId,
    ]);

    useEffect(() => {
        return () => {
            if (autosaveTimerRef.current) {
                window.clearTimeout(autosaveTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (autosaveTimerRef.current) {
            window.clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
        }
    }, [currentScriptId]);

    const saveLatest = useCallback(async (value: SlateValue) => {
        if (!currentScriptId) {
            return;
        }

        const serialized = serializeValue(value);

        if (serialized === lastSavedSerializedRef.current) {
            return;
        }

        try {
            await scriptRepository.saveLatest(currentScriptId, value);
            lastSavedSerializedRef.current = serialized;
        } catch (error) {
            console.error('Failed to save latest script', error);
            setStorageError('Failed to save script data.');
            addToast({
                title: 'Failed to save',
                description: 'Changes were not saved.',
                variant: 'error',
            });
        }
    }, [currentScriptId]);

    const scheduleAutosave = useCallback(
        (value: SlateValue) => {
            const serialized = serializeValue(value);

            if (serialized === lastSavedSerializedRef.current) {
                return;
            }

            if (autosaveTimerRef.current) {
                window.clearTimeout(autosaveTimerRef.current);
            }

            autosaveTimerRef.current = window.setTimeout(() => {
                const latestValue = latestValueRef.current;

                if (!latestValue) {
                    return;
                }

                void saveLatest(latestValue);
            }, AUTOSAVE_DELAY_MS);
        },
        [saveLatest],
    );

    const handleValueChange = useCallback(
        (value: SlateValue) => {
            console.log('EDITOR VALUE (DB JSON):', value);

            latestValueRef.current = value;
            scheduleAutosave(value);
            setSerializedPreview(serializeFountain(value as unknown as FountainDocument));
        },
        [scheduleAutosave],
    );

    const handleManualSave = useCallback(async (value: SlateValue) => {
        if (autosaveTimerRef.current) {
            window.clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
        }

        if (!currentScript) {
            return;
        }

        try {
            await scriptRepository.saveLatest(currentScriptId, value);
            lastSavedSerializedRef.current = serializeValue(value);
            await scriptRepository.commitVersion(currentScriptId);
            addToast({
                title: 'Script saved',
                description: currentScript.name,
                variant: 'success',
            });
        } catch (error) {
            console.error('Failed to commit script version', error);
            setStorageError('Failed to commit script version.');
            addToast({
                title: 'Failed to save',
                description: 'Please try again.',
                variant: 'error',
            });
        }
    }, [currentScript, currentScriptId]);

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
                    onSelectScript={script => navigate(`/script/${script.id}/editor`)}
                    onHome={() => navigate('/')}
                    onNewScript={() => setIsModalOpen(true)}
                    onMenuAction={actionId => {
                        if (actionId === 'scripts') {
                            void navigate('/script/list');

                            return;
                        }

                        if (actionId === 'settings') {
                            void navigate(`/script/${currentScript.id}/settings`);

                            return;
                        }

                        if (actionId === 'new-script') {
                            setIsModalOpen(true);
                        }
                    }}
                />
            )}
            sidebar={<EditorSidebar scenes={scenes} onSceneClick={() => {}} />}
        >
            {storageError ? (
                <div role="alert" style={{padding: '12px 20px'}}>
                    {storageError}
                </div>
            ) : null}
            <FountainEditor
                initialValue={initialValue ?? undefined}
                onValueChange={handleValueChange}
                onManualSave={handleManualSave}
                autoFocus={shouldAutoFocus}
            />
            <NewScriptModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={name => {
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
                }}
            />
        </AppLayout>
    );
};
