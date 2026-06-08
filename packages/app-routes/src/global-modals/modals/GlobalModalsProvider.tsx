import {
    useScriptRepository,
    useScriptsContext,
} from '@stagistic/app-core';
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
    useMemo,
} from 'react';
import {useNavigate} from 'react-router-dom';

import {useGlobalModalActions} from './useGlobalModalActions';

type GlobalModalsController = {
    openNewScript: () => void,
    openImportScript: () => void,
    isImportLoading?: boolean,
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
    const refreshScripts = useCallback(() => {
        void scriptsStore.refresh();
    }, [scriptsStore]);

    const {
        isNewScriptOpen,
        isImportOpen,
        prefilledImport,
        isImportLoading,
        openNewScript,
        closeNewScript,
        openImportScript,
        closeImportScript,
        handleCreate,
        handleImport,
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
    });

    const contextValue = useMemo<GlobalModalsController>(() => ({
        openNewScript,
        openImportScript,
        isImportLoading,
    }), [
        openImportScript,
        openNewScript,
        isImportLoading,
    ]);

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
                preselectedFile={prefilledImport}
                isLoading={isImportLoading}
            />
        </GlobalModalsContext.Provider>
    );
};
