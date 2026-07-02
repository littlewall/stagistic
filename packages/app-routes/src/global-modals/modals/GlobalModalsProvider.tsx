import {
    useScriptRepository,
    useScriptsContext,
} from '@stagistic/app-core';
import {
    DeleteScriptModal,
    ImportScriptModal,
    NewScriptModal,
    RenameScriptModal,
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

import {
    type ScriptToDelete,
    type ScriptToRename,
    useGlobalModalActions,
} from './useGlobalModalActions';

type GlobalModalsController = {
    openNewScript: () => void,
    openImportScript: () => void,
    openDeleteScript: (script: ScriptToDelete) => void,
    openRenameScript: (script: ScriptToRename) => void,
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
        scriptToDelete,
        isDeleteScriptOpen,
        isDeleting,
        scriptToRename,
        isRenameScriptOpen,
        isRenaming,
        openNewScript,
        closeNewScript,
        openImportScript,
        closeImportScript,
        openDeleteScript,
        closeDeleteScript,
        openRenameScript,
        closeRenameScript,
        handleCreate,
        handleImport,
        handleDelete,
        handleRename,
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
        openDeleteScript,
        openRenameScript,
    }), [
        openDeleteScript,
        openImportScript,
        openNewScript,
        openRenameScript,
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
            <DeleteScriptModal
                isOpen={isDeleteScriptOpen}
                scriptTitle={scriptToDelete?.title}
                isDeleting={isDeleting}
                onClose={closeDeleteScript}
                onConfirm={handleDelete}
            />
            <RenameScriptModal
                isOpen={isRenameScriptOpen}
                initialTitle={scriptToRename?.title ?? ''}
                initialSubtitle={scriptToRename?.subtitle ?? ''}
                isPending={isRenaming}
                onClose={closeRenameScript}
                onSubmit={handleRename}
            />
        </GlobalModalsContext.Provider>
    );
};
