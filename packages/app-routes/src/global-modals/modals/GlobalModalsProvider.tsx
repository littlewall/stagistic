import {useScriptRepository} from '@stagistic/app-core';
import {
    DeleteScriptModal,
    DuplicateScriptModal,
    ImportScriptModal,
    NewScriptModal,
    RenameScriptModal,
    useToastController,
} from '@stagistic/ui';
import {
    createContext,
    type ReactNode,
    useContext,
    useMemo,
} from 'react';
import {useNavigate} from 'react-router-dom';

import {
    type ScriptToDelete,
    type ScriptToDuplicate,
    type ScriptToRename,
    useGlobalModalActions,
} from './useGlobalModalActions';

type GlobalModalsController = {
    openNewScript: () => void,
    openImportScript: () => void,
    openDeleteScript: (script: ScriptToDelete) => void,
    openRenameScript: (script: ScriptToRename) => void,
    openDuplicateScript: (script: ScriptToDuplicate) => void,
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
    const {addToast} = useToastController();

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
        scriptToDuplicate,
        isDuplicateScriptOpen,
        isDuplicating,
        openNewScript,
        closeNewScript,
        openImportScript,
        closeImportScript,
        openDeleteScript,
        closeDeleteScript,
        openRenameScript,
        closeRenameScript,
        openDuplicateScript,
        closeDuplicateScript,
        handleCreate,
        handleImport,
        handleDelete,
        handleRename,
        handleDuplicate,
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
    });

    const contextValue = useMemo<GlobalModalsController>(() => ({
        openNewScript,
        openImportScript,
        openDeleteScript,
        openRenameScript,
        openDuplicateScript,
    }), [
        openDeleteScript,
        openDuplicateScript,
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
            <DuplicateScriptModal
                isOpen={isDuplicateScriptOpen}
                initialTitle={scriptToDuplicate ? `${scriptToDuplicate.title} - copy` : ''}
                isPending={isDuplicating}
                onClose={closeDuplicateScript}
                onSubmit={handleDuplicate}
            />
        </GlobalModalsContext.Provider>
    );
};
