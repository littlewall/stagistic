import {useScriptActions, useScriptRepository} from '@stagistic/app-core';
import {DeleteScriptModal, DuplicateScriptModal, ImportScriptModal, NewScriptModal, RenameScriptModal, useToastController} from '@stagistic/ui';
import {createContext, type ReactNode, useCallback, useContext, useMemo} from 'react';
import {useNavigate} from 'react-router-dom';

import {type ScriptToDelete, type ScriptToDuplicate, type ScriptToRename, useGlobalModalActions} from './useGlobalModalActions';
import {useNewScriptTransitionCompletion} from './useNewScriptTransitionCompletion';

type GlobalModalsController = {
    openNewScript: () => void;
    openImportScript: () => void;
    openDeleteScript: (script: ScriptToDelete) => void;
    openRenameScript: (script: ScriptToRename) => void;
    openDuplicateScript: (script: ScriptToDuplicate) => void;
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
    children: ReactNode;
}

export const GlobalModalsProvider = ({children}: GlobalModalsProviderProps) => {
    const navigate = useNavigate();
    const scriptRepository = useScriptRepository();
    const scriptActions = useScriptActions();
    const saveTitlePage = useCallback(
        (scriptId: string, settings: Parameters<typeof scriptRepository.saveTitlePage>[1]) => scriptRepository.saveTitlePage(scriptId, settings),
        [scriptRepository],
    );
    const {addToast} = useToastController();

    const {
        isNewScriptOpen,
        newScriptTransitionPath,
        isImportOpen,
        prefilledImport,
        isImportLoading,
        isDownloadingBackup,
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
        completeNewScriptTransition,
        openImportScript,
        closeImportScript,
        openDeleteScript,
        closeDeleteScript,
        openRenameScript,
        closeRenameScript,
        openDuplicateScript,
        closeDuplicateScript,
        handleCreate,
        handleImportStagistic,
        handlePeekStepkg,
        handleImportStepkgAsNew,
        handleReplaceWithStepkg,
        handleDownloadStepkgBackup,
        handleDelete,
        handleRename,
        handleDuplicate,
    } = useGlobalModalActions({
        scriptActions,
        repository: scriptRepository,
        saveTitlePage,
        navigation: {
            navigate,
        },
        notifications: {
            addToast,
        },
    });

    useNewScriptTransitionCompletion({
        targetPath: newScriptTransitionPath,
        onComplete: completeNewScriptTransition,
    });

    const contextValue = useMemo<GlobalModalsController>(
        () => ({
            openNewScript,
            openImportScript,
            openDeleteScript,
            openRenameScript,
            openDuplicateScript,
        }),
        [openDeleteScript, openDuplicateScript, openImportScript, openNewScript, openRenameScript],
    );

    return (
        <GlobalModalsContext.Provider value={contextValue}>
            {children}
            <NewScriptModal isOpen={isNewScriptOpen} isTransitioning={newScriptTransitionPath !== null} onClose={closeNewScript} onCreate={handleCreate} />
            <ImportScriptModal
                isOpen={isImportOpen}
                onClose={closeImportScript}
                onImportStagistic={handleImportStagistic}
                onImportStepkgAsNew={handleImportStepkgAsNew}
                onReplaceWithStepkg={handleReplaceWithStepkg}
                onDownloadStepkgBackup={handleDownloadStepkgBackup}
                onPeekStepkg={handlePeekStepkg}
                preselectedFile={prefilledImport}
                isLoading={isImportLoading}
                isDownloadingBackup={isDownloadingBackup}
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
