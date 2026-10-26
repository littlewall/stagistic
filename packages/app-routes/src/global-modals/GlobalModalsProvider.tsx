import {useScriptActions, useScriptRepository} from '@stagistic/app-core';
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
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from 'react';
import {useNavigate} from 'react-router-dom';

import {AppSettingsModal} from '../app-settings/AppSettingsModal';
import type {AppSettingsSection} from '../app-settings/types';
import {
    type ScriptToDelete,
    type ScriptToDuplicate,
    type ScriptToRename,
    useGlobalModalActions,
} from './useGlobalModalActions';
import {useNewScriptTransitionCompletion} from './useNewScriptTransitionCompletion';

type GlobalModalsController = {
    openNewScript: (returnFocus?: HTMLElement | null) => void,
    openImportScript: (returnFocus?: HTMLElement | null) => void,
    openDeleteScript: (script: ScriptToDelete, returnFocus?: HTMLElement | null) => void,
    openRenameScript: (script: ScriptToRename, returnFocus?: HTMLElement | null) => void,
    openDuplicateScript: (script: ScriptToDuplicate, returnFocus?: HTMLElement | null) => void,
    openAppSettings: (returnFocus?: HTMLElement | null) => void,
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
    /** Platform sections of the app settings, listed after Appearance. Keep the array stable. */
    settingsSections?: AppSettingsSection[],
}

export const GlobalModalsProvider = ({children, settingsSections}: GlobalModalsProviderProps) => {
    const navigate = useNavigate();
    const [isAppSettingsOpen, setIsAppSettingsOpen] = useState(false);
    const appSettingsReturnFocus = useRef<HTMLElement | null>(null);
    const openAppSettings = useCallback((returnFocus?: HTMLElement | null) => {
        appSettingsReturnFocus.current = returnFocus ?? null;
        setIsAppSettingsOpen(true);
    }, []);
    const closeAppSettings = useCallback(() => setIsAppSettingsOpen(false), []);
    const scriptRepository = useScriptRepository();
    const scriptActions = useScriptActions();
    const saveTitlePage = useCallback(
        (scriptId: string, settings: Parameters<typeof scriptRepository.saveTitlePage>[1]) => scriptRepository.saveTitlePage(scriptId, settings),
        [scriptRepository],
    );
    const {addToast} = useToastController();

    const {
        newScriptReturnFocus,
        importScriptReturnFocus,
        deleteScriptReturnFocus,
        renameScriptReturnFocus,
        duplicateScriptReturnFocus,
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
            openAppSettings,
        }),
        [
            openAppSettings,
            openDeleteScript,
            openDuplicateScript,
            openImportScript,
            openNewScript,
            openRenameScript,
        ],
    );

    return (
        <GlobalModalsContext.Provider value={contextValue}>
            {children}
            <NewScriptModal
                isOpen={isNewScriptOpen}
                isTransitioning={newScriptTransitionPath !== null}
                returnFocus={newScriptReturnFocus}
                onClose={closeNewScript}
                onCreate={handleCreate}
            />
            <ImportScriptModal
                isOpen={isImportOpen}
                returnFocus={importScriptReturnFocus}
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
                returnFocus={deleteScriptReturnFocus}
                scriptTitle={scriptToDelete?.title}
                isDeleting={isDeleting}
                onClose={closeDeleteScript}
                onConfirm={handleDelete}
            />
            <RenameScriptModal
                isOpen={isRenameScriptOpen}
                returnFocus={renameScriptReturnFocus}
                initialTitle={scriptToRename?.title ?? ''}
                initialSubtitle={scriptToRename?.subtitle ?? ''}
                isPending={isRenaming}
                onClose={closeRenameScript}
                onSubmit={handleRename}
            />
            <DuplicateScriptModal
                isOpen={isDuplicateScriptOpen}
                returnFocus={duplicateScriptReturnFocus}
                initialTitle={scriptToDuplicate ? `${scriptToDuplicate.title} - copy` : ''}
                isPending={isDuplicating}
                onClose={closeDuplicateScript}
                onSubmit={handleDuplicate}
            />
            <AppSettingsModal
                isOpen={isAppSettingsOpen}
                returnFocus={appSettingsReturnFocus}
                sections={settingsSections}
                onClose={closeAppSettings}
            />
        </GlobalModalsContext.Provider>
    );
};
