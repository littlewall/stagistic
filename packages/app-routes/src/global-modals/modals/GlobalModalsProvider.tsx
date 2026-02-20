import {
    useScriptRepository,
    useScriptsContext,
} from '@stagistic/app-core';
import {
    isTauriRuntime,
    listenTauriFountainDrop,
    MENU_EVENT_IMPORT_SCRIPT,
    MENU_EVENT_NEW_SCRIPT,
    pickTauriFountainFile,
} from '@stagistic/platform-core';
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

import {useGlobalModalActions} from './useGlobalModalActions';

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

interface GlobalModalsProviderProps {
    children: ReactNode,
}

export const GlobalModalsProvider = ({children}: GlobalModalsProviderProps) => {
    const navigate = useNavigate();
    const scriptRepository = useScriptRepository();
    const {scriptsStore} = useScriptsContext();
    const {addToast} = useToastController();
    const [isTauri, setIsTauri] = useState(false);
    const refreshScripts = useCallback(() => {
        void scriptsStore.refresh();
    }, [scriptsStore]);

    const {
        isNewScriptOpen,
        isImportOpen,
        prefilledImport,
        openNewScript,
        closeNewScript,
        openImportScript,
        closeImportScript,
        setPrefilledImport,
        handleCreate,
        handleImport,
        pickImportFile,
    } = useGlobalModalActions({
        repository: {
            scriptRepository,
        },
        navigation: {
            navigate,
        },
        notifications: {
            addToast,
        },
        state: {
            refreshScripts,
        },
        requests: {
            pickFile: pickTauriFountainFile,
        },
    });

    useEffect(() => {
        let active = true;

        const check = async () => {
            const result = await isTauriRuntime();

            if (active) {
                setIsTauri(Boolean(result));
            }
        };

        void check();

        return () => {
            active = false;
        };
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

        const setup = async () => {
            const stop = await listenTauriFountainDrop(({fileName, text}) => {
                setPrefilledImport({fileName, text});
                openImportScript();
            });

            if (!stop) {
                console.error('Failed to listen for file drop events');

                return;
            }

            unlisten = stop;
        };

        void setup();

        return () => {
            if (unlisten) {
                unlisten();
            }
        };
    }, [
        isTauri,
        openImportScript,
        setPrefilledImport,
    ]);

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
