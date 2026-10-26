import {
    useCallback,
    useMemo,
    useRef,
    useState,
} from 'react';

import type {
    GlobalModalActions,
    ScriptImportFile,
    ScriptToDelete,
    ScriptToDuplicate,
    ScriptToRename,
    UseGlobalModalActionsArgs,
} from './globalModalTypes';
import {useGlobalModalMutations} from './useGlobalModalMutations';

export type {
    ScriptToDelete,
    ScriptToDuplicate,
    ScriptToRename,
} from './globalModalTypes';

export const useGlobalModalActions = ({
    scriptActions,
    repository,
    saveTitlePage,
    navigation,
    notifications,
}: UseGlobalModalActionsArgs): GlobalModalActions => {
    const {navigate} = navigation;
    const {addToast} = notifications;
    const newScriptReturnFocus = useRef<HTMLElement | null>(null);
    const importScriptReturnFocus = useRef<HTMLElement | null>(null);
    const deleteScriptReturnFocus = useRef<HTMLElement | null>(null);
    const renameScriptReturnFocus = useRef<HTMLElement | null>(null);
    const duplicateScriptReturnFocus = useRef<HTMLElement | null>(null);
    const [isNewScriptOpen, setIsNewScriptOpen] = useState(false);
    const [newScriptTransitionPath, setNewScriptTransitionPath] = useState<string | null>(null);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isImportLoading, setIsImportLoading] = useState(false);
    const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
    const [prefilledImport, setPrefilledImport] = useState<ScriptImportFile | null>(null);
    const [scriptToDelete, setScriptToDelete] = useState<ScriptToDelete | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [scriptToRename, setScriptToRename] = useState<ScriptToRename | null>(null);
    const [isRenaming, setIsRenaming] = useState(false);
    const [scriptToDuplicate, setScriptToDuplicate] = useState<ScriptToDuplicate | null>(null);
    const [isDuplicating, setIsDuplicating] = useState(false);

    const openNewScript = useCallback((returnFocus?: HTMLElement | null) => {
        newScriptReturnFocus.current = returnFocus ?? null;
        setIsNewScriptOpen(true);
    }, []);
    const closeNewScript = useCallback(() => setIsNewScriptOpen(false), []);
    const completeNewScriptTransition = useCallback(() => {
        setIsNewScriptOpen(false);
        setNewScriptTransitionPath(null);
    }, []);
    const openImportScript = useCallback((returnFocus?: HTMLElement | null) => {
        importScriptReturnFocus.current = returnFocus ?? null;
        setIsImportOpen(true);
    }, []);
    const closeImportScript = useCallback(() => {
        setIsImportOpen(false);
        setPrefilledImport(null);
    }, []);
    const openDeleteScript = useCallback((script: ScriptToDelete, returnFocus?: HTMLElement | null) => {
        deleteScriptReturnFocus.current = returnFocus ?? null;
        setScriptToDelete(script);
    }, []);
    const closeDeleteScript = useCallback(() => {
        if (!isDeleting) {
            setScriptToDelete(null);
        }
    }, [isDeleting]);
    const openRenameScript = useCallback((script: ScriptToRename, returnFocus?: HTMLElement | null) => {
        renameScriptReturnFocus.current = returnFocus ?? null;
        setScriptToRename(script);
    }, []);
    const closeRenameScript = useCallback(() => {
        if (!isRenaming) {
            setScriptToRename(null);
        }
    }, [isRenaming]);
    const openDuplicateScript = useCallback((script: ScriptToDuplicate, returnFocus?: HTMLElement | null) => {
        duplicateScriptReturnFocus.current = returnFocus ?? null;
        setScriptToDuplicate(script);
    }, []);
    const closeDuplicateScript = useCallback(() => {
        if (!isDuplicating) {
            setScriptToDuplicate(null);
        }
    }, [isDuplicating]);
    const mutations = useGlobalModalMutations({
        scriptActions,
        repository,
        saveTitlePage,
        navigate,
        addToast,
        scriptToDelete,
        scriptToRename,
        scriptToDuplicate,
        setNewScriptTransitionPath,
        setIsImportOpen,
        setIsImportLoading,
        setIsDownloadingBackup,
        setPrefilledImport,
        setScriptToDelete,
        setIsDeleting,
        setScriptToRename,
        setIsRenaming,
        setScriptToDuplicate,
        setIsDuplicating,
    });

    return useMemo(
        () => ({
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
            isDeleteScriptOpen: scriptToDelete !== null,
            isDeleting,
            scriptToRename,
            isRenameScriptOpen: scriptToRename !== null,
            isRenaming,
            scriptToDuplicate,
            isDuplicateScriptOpen: scriptToDuplicate !== null,
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
            setPrefilledImport,
            ...mutations,
        }),
        [
            closeDeleteScript,
            closeDuplicateScript,
            closeImportScript,
            closeNewScript,
            completeNewScriptTransition,
            closeRenameScript,
            isDeleting,
            isDownloadingBackup,
            isDuplicating,
            isImportLoading,
            isImportOpen,
            isNewScriptOpen,
            newScriptTransitionPath,
            isRenaming,
            mutations,
            openDeleteScript,
            openDuplicateScript,
            openImportScript,
            openNewScript,
            openRenameScript,
            prefilledImport,
            scriptToDelete,
            scriptToDuplicate,
            scriptToRename,
        ],
    );
};
