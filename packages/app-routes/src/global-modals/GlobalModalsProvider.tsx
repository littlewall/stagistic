import {useScripts} from '@stagistic/app-core';
import {
    MENU_EVENT_IMPORT_SCRIPT,
    MENU_EVENT_NEW_SCRIPT,
} from '@stagistic/app-core';
import {parseFountain} from '@stagistic/editor-core';
import {
    ensureNodeIds,
    ensureSceneHeading,
    type SlateValue,
} from '@stagistic/shared';
import {
    ImportScriptModal,
    NewScriptModal,
    useToastController,
} from '@stagistic/ui';
import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {useNavigate} from 'react-router-dom';

type GlobalModalsController = {
    openNewScript: () => void,
    openImportScript: () => void,
};

const GlobalModalsContext = createContext<GlobalModalsController | null>(null);

export const useGlobalModals = () => {
    const context = useContext(GlobalModalsContext);

    if (!context) {
        throw new Error('useGlobalModals must be used within GlobalModalsProvider');
    }

    return context;
};

type GlobalModalsProviderProps = {
    children: ReactNode,
};

const normalizeFountainSource = (source: string) => source
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

export const GlobalModalsProvider = ({children}: GlobalModalsProviderProps) => {
    const navigate = useNavigate();
    const {createScript} = useScripts();
    const {addToast} = useToastController();
    const [isNewScriptOpen, setIsNewScriptOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [prefilledImport, setPrefilledImport] = useState<{fileName: string, text: string} | null>(null);
    const [isTauri, setIsTauri] = useState(false);

    useEffect(() => {
        let active = true;

        const check = async () => {
            try {
                const {isTauri: isTauriRuntime} = await import('@tauri-apps/api/core');
                const result = await isTauriRuntime();

                if (active) {
                    setIsTauri(Boolean(result));
                }
            } catch {
                if (active) {
                    setIsTauri(false);
                }
            }
        };

        void check();

        return () => {
            active = false;
        };
    }, []);

    const openNewScript = useCallback(() => {
        setIsNewScriptOpen(true);
    }, []);

    const closeNewScript = useCallback(() => {
        setIsNewScriptOpen(false);
    }, []);

    const openImportScript = useCallback(() => {
        setIsImportOpen(true);
    }, []);

    const closeImportScript = useCallback(() => {
        setIsImportOpen(false);
        setPrefilledImport(null);
    }, []);

    useEffect(() => {
        const handleNewScript = () => {
            openNewScript();
        };

        const handleImport = () => {
            openImportScript();
        };

        window.addEventListener(MENU_EVENT_NEW_SCRIPT, handleNewScript);
        window.addEventListener(MENU_EVENT_IMPORT_SCRIPT, handleImport);

        return () => {
            window.removeEventListener(MENU_EVENT_NEW_SCRIPT, handleNewScript);
            window.removeEventListener(MENU_EVENT_IMPORT_SCRIPT, handleImport);
        };
    }, [openImportScript, openNewScript]);

    useEffect(() => {
        if (!isTauri) {
            return;
        }

        let unlisten: null | (() => void) = null;
        let disposed = false;

        const setup = async () => {
            try {
                const {getCurrentWebview} = await import('@tauri-apps/api/webview');
                const {readTextFile} = await import('@tauri-apps/plugin-fs');

                const stop = await getCurrentWebview().onDragDropEvent(async event => {
                    if (event.payload.type !== 'drop') {
                        return;
                    }

                    const paths = event.payload.paths ?? [];
                    const target = paths.find(path => path.toLowerCase().endsWith('.fountain'));

                    if (!target) {
                        addToast({
                            title: 'Unsupported file',
                            description: 'Only .fountain files can be imported.',
                            variant: 'error',
                        });

                        return;
                    }

                    try {
                        const text = await readTextFile(target);
                        const fileName = target.split(/[/\\\\]/).pop() ?? 'Untitled.fountain';

                        setPrefilledImport({fileName, text});
                        setIsImportOpen(true);
                    } catch (error) {
                        console.error('Failed to read dropped file', error);
                        addToast({
                            title: 'Failed to read file',
                            description: 'Please try again.',
                            variant: 'error',
                        });
                    }
                });

                if (disposed) {
                    stop();

                    return;
                }

                unlisten = stop;
            } catch (error) {
                console.error('Failed to listen for file drop events', error);
            }
        };

        void setup();

        return () => {
            disposed = true;
            if (unlisten) {
                unlisten();
            }
        };
    }, [addToast, isTauri]);

    const handleCreate = useCallback((name: string) => {
        const createAndNavigate = async () => {
            try {
                const scriptId = await createScript(name);

                setIsNewScriptOpen(false);
                void navigate(`/script/${scriptId}/editor`);
                addToast({
                    title: 'Script created',
                    description: name.trim() || 'Untitled script',
                    variant: 'success',
                });
            } catch (error) {
                console.error('Failed to create script', error);
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

    const handleImport = useCallback((payload: {
        name: string,
        fileName: string,
        text: string,
    }) => {
        const importAndNavigate = async () => {
            try {
                if (!payload.fileName.toLowerCase().endsWith('.fountain')) {
                    addToast({
                        title: 'Unsupported file',
                        description: 'Only .fountain files can be imported.',
                        variant: 'error',
                    });

                    return;
                }

                const parsed = parseFountain(normalizeFountainSource(payload.text));
                const normalized = ensureNodeIds(ensureSceneHeading(parsed));
                const resolvedName = payload.name.trim()
                    || payload.fileName.replace(/\.fountain$/i, '').trim()
                    || 'Untitled script';
                const scriptId = await createScript(resolvedName, normalized as unknown as SlateValue);

                setIsImportOpen(false);
                void navigate(`/script/${scriptId}/editor`);
                addToast({
                    title: 'Script imported',
                    description: resolvedName,
                    variant: 'success',
                });
            } catch (error) {
                console.error('Failed to import script', error);
                addToast({
                    title: 'Failed to import script',
                    description: 'Please try again.',
                    variant: 'error',
                });
            }
        };

        void importAndNavigate();
    }, [
        addToast,
        createScript,
        navigate,
    ]);

    const pickImportFile = useCallback(async () => {
        const [{open}, {readTextFile}] = await Promise.all([import('@tauri-apps/plugin-dialog'), import('@tauri-apps/plugin-fs')]);

        const selected = await open({
            multiple: false,
            filters: [{name: 'Fountain', extensions: ['fountain']}],
        });

        if (!selected || Array.isArray(selected)) {
            return null;
        }

        const text = await readTextFile(selected);
        const fileName = selected.split(/[/\\\\]/).pop() ?? 'Untitled.fountain';

        return {fileName, text};
    }, []);

    const contextValue = useMemo<GlobalModalsController>(() => ({
        openNewScript,
        openImportScript,
    }), [openImportScript, openNewScript]);

    return (
        <GlobalModalsContext.Provider value={contextValue}>
            {children}
            <NewScriptModal
                isOpen={isNewScriptOpen}
                onClose={closeNewScript}
                onCreate={handleCreate}
            />
            <ImportScriptModal
                isOpen={isImportOpen}
                onClose={closeImportScript}
                onImport={handleImport}
                onPickFile={isTauri ? pickImportFile : undefined}
                preselectedFile={prefilledImport}
            />
        </GlobalModalsContext.Provider>
    );
};
