import {type FountainDocument, serializeFountain} from '@stagistic/editor-core';
import type {SlateValue} from '@stagistic/shared';
import {
    AppHeader,
    AppLayout,
    EditorSidebar,
    FountainEditor,
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

import {NewScriptModal} from '~components/NewScriptModal';
import {useToastController} from '~components/ToastProvider';
import {
    MENU_EVENT_IMPORT_SCRIPT,
    MENU_EVENT_NEW_SCRIPT,
} from '~constants/menuEvents';
import {useScripts} from '~hooks/useScripts';
import {scriptRepository} from '~repo';
import {
    ensureNodeIds,
    ensureSceneHeading,
    getFirstBlockId,
    isSlateValueEmpty,
    valueHasBlockId,
} from '~utils/editorDefaults';

const AUTOSAVE_DELAY_MS = 1500;
const DEFAULT_SCRIPT_TITLE = 'Untitled script';

const serializeValue = (value: SlateValue) => JSON.stringify(value);

export const ScriptEditorRoute = () => {
    const navigate = useNavigate();
    const {scriptId} = useParams();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const {
        scripts,
        scriptSummaries,
        createScript,
        setActiveBlock,
        isLoading: scriptsLoading,
    } = useScripts();
    const [initialValue, setInitialValue] = useState<SlateValue | null | undefined>(undefined);
    const [serializedPreview, setSerializedPreview] = useState<string>('');
    const [storageError, setStorageError] = useState<string | null>(null);
    const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
    const activeBlockRef = useRef<string | null>(null);
    const activeBlockTimerRef = useRef<number | null>(null);
    const latestValueRef = useRef<SlateValue | null>(null);
    const lastSavedSerializedRef = useRef<string | null>(null);
    const autosaveTimerRef = useRef<number | null>(null);
    const {addToast} = useToastController();

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
    const currentScriptSummary = useMemo(
        () => scriptSummaries.find(script => script.id === currentScript?.id),
        [scriptSummaries, currentScript?.id],
    );
    const currentScriptId = currentScript?.id ?? null;
    const preferredActiveBlockIdRef = useRef<string | null>(null);

    useEffect(() => {
        preferredActiveBlockIdRef.current = currentScriptSummary?.activeBlockId ?? null;
    }, [currentScriptId, currentScriptSummary?.activeBlockId]);

    const resolveActiveBlockId = useCallback(
        (value: SlateValue, preferredId: string | null) => {
            if (preferredId && valueHasBlockId(value, preferredId)) {
                return preferredId;
            }

            return getFirstBlockId(value);
        },
        [],
    );

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

                const preferredActiveBlockId = preferredActiveBlockIdRef.current;

                if (stored) {
                    const needsFocus = isSlateValueEmpty(stored);
                    const storedSerialized = serializeValue(stored);
                    const normalized = ensureNodeIds(ensureSceneHeading(stored));
                    const normalizedSerialized = serializeValue(normalized);
                    const resolvedActiveBlockId = resolveActiveBlockId(normalized, preferredActiveBlockId);

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
                    setActiveBlockId(resolvedActiveBlockId);
                    activeBlockRef.current = resolvedActiveBlockId;

                    if (resolvedActiveBlockId && resolvedActiveBlockId !== preferredActiveBlockId) {
                        void setActiveBlock(currentScriptId, resolvedActiveBlockId);
                    }

                    return;
                }

                const fallback = ensureNodeIds(ensureSceneHeading(null, {activeBlockId: preferredActiveBlockId}));
                const fallbackActiveBlockId = resolveActiveBlockId(fallback, preferredActiveBlockId);

                latestValueRef.current = fallback;
                lastSavedSerializedRef.current = serializeValue(fallback);
                setInitialValue(fallback);
                setSerializedPreview(serializeFountain(fallback as unknown as FountainDocument));
                setShouldAutoFocus(true);
                setActiveBlockId(fallbackActiveBlockId);
                activeBlockRef.current = fallbackActiveBlockId;

                if (fallbackActiveBlockId && fallbackActiveBlockId !== preferredActiveBlockId) {
                    void setActiveBlock(currentScriptId, fallbackActiveBlockId);
                }
            } catch (error) {
                console.error('Failed to load latest script', error);
                setStorageError('Failed to load script data.');

                const fallback = ensureNodeIds(ensureSceneHeading(null));
                const fallbackActiveBlockId = getFirstBlockId(fallback);

                setInitialValue(fallback);
                setSerializedPreview('');
                setShouldAutoFocus(true);
                setActiveBlockId(fallbackActiveBlockId);
                activeBlockRef.current = fallbackActiveBlockId;
            }
        };

        void loadLatest();

        return () => {
            isActive = false;
        };
    }, [
        currentScriptId,
        resolveActiveBlockId,
        setActiveBlock,
    ]);

    useEffect(() => {
        return () => {
            if (autosaveTimerRef.current) {
                window.clearTimeout(autosaveTimerRef.current);
            }

            if (activeBlockTimerRef.current) {
                window.clearTimeout(activeBlockTimerRef.current);
                activeBlockTimerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        return () => {
            if (!currentScriptId) {
                return;
            }

            const lastActiveBlockId = activeBlockRef.current;

            if (lastActiveBlockId) {
                void setActiveBlock(currentScriptId, lastActiveBlockId);
            }
        };
    }, [currentScriptId, setActiveBlock]);

    useEffect(() => {
        if (autosaveTimerRef.current) {
            window.clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
        }

        if (activeBlockTimerRef.current) {
            window.clearTimeout(activeBlockTimerRef.current);
            activeBlockTimerRef.current = null;
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

    const handleActiveBlockChange = useCallback((blockId: string | null) => {
        if (!currentScriptId) {
            return;
        }

        if (!blockId) {
            return;
        }

        if (blockId === activeBlockRef.current) {
            return;
        }

        activeBlockRef.current = blockId;
        setActiveBlockId(blockId);

        if (activeBlockTimerRef.current) {
            window.clearTimeout(activeBlockTimerRef.current);
        }

        activeBlockTimerRef.current = window.setTimeout(() => {
            void setActiveBlock(currentScriptId, blockId);
        }, 200);
    }, [currentScriptId, setActiveBlock]);

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
                activeBlockId={activeBlockId ?? undefined}
                onActiveBlockChange={handleActiveBlockChange}
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
