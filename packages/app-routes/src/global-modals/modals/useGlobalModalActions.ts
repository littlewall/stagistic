import {
    createNodeId,
    getFirstBlockId,
    type ScriptDocument,
    type TitlePageSettings,
    trimOrFallback,
} from '@stagistic/script';
import {
    useCallback,
    useMemo,
    useState,
} from 'react';
import {type NavigateFunction} from 'react-router-dom';

import type {AppToastPayload} from '../../routes/script/types';
import {importStagisticFile} from './importStagisticFile';

export interface ScriptImportFile {
    fileName: string,
    text: string,
}

export interface ScriptToDelete {
    id: string,
    title: string,
}

export interface ScriptToRename {
    id: string,
    title: string,
    subtitle: string,
}

export interface ScriptToDuplicate {
    id: string,
    title: string,
}

interface ScriptRepositoryAdapter {
    createScript: (name: string, initialContent?: ScriptDocument) => Promise<string>,
    renameScript: (scriptId: string, input: {title: string, subtitle: string | null}) => Promise<void>,
    duplicateScript: (
        sourceScriptId: string,
        input: {title: string, copySettings: boolean, copyAttributes: boolean},
    ) => Promise<string>,
    deleteScript: (scriptId: string) => Promise<void>,
    saveTitlePage: (scriptId: string, settings: TitlePageSettings) => Promise<void>,
    setActiveBlock: (scriptId: string, blockId: string | null) => Promise<void>,
}

interface UseGlobalModalActionsArgs {
    repository: {
        scriptRepository: ScriptRepositoryAdapter,
    },
    navigation: {
        navigate: NavigateFunction,
    },
    notifications: {
        addToast: (toast: AppToastPayload) => void,
    },
    state: {
        refreshScripts: () => void,
    },
}

export interface GlobalModalActions {
    isNewScriptOpen: boolean,
    isImportOpen: boolean,
    prefilledImport: ScriptImportFile | null,
    isImportLoading: boolean,
    scriptToDelete: ScriptToDelete | null,
    isDeleteScriptOpen: boolean,
    isDeleting: boolean,
    scriptToRename: ScriptToRename | null,
    isRenameScriptOpen: boolean,
    isRenaming: boolean,
    scriptToDuplicate: ScriptToDuplicate | null,
    isDuplicateScriptOpen: boolean,
    isDuplicating: boolean,
    openNewScript: () => void,
    closeNewScript: () => void,
    openImportScript: () => void,
    closeImportScript: () => void,
    openDeleteScript: (script: ScriptToDelete) => void,
    closeDeleteScript: () => void,
    openRenameScript: (script: ScriptToRename) => void,
    closeRenameScript: () => void,
    openDuplicateScript: (script: ScriptToDuplicate) => void,
    closeDuplicateScript: () => void,
    setPrefilledImport: (value: ScriptImportFile | null) => void,
    handleCreate: (name: string) => Promise<void>,
    handleImport: (payload: ScriptImportFile & {name: string}) => Promise<void>,
    handleDelete: () => Promise<void>,
    handleRename: (values: {title: string, subtitle: string}) => Promise<void>,
    handleDuplicate: (values: {
        title: string,
        copySettings: boolean,
        copyAttributes: boolean,
        openInEditor: boolean,
    }) => Promise<void>,
}

export const useGlobalModalActions = ({
    repository,
    navigation,
    notifications,
    state,
}: UseGlobalModalActionsArgs): GlobalModalActions => {
    const {scriptRepository} = repository;
    const {navigate} = navigation;
    const {addToast} = notifications;
    const {refreshScripts} = state;
    const [isNewScriptOpen, setIsNewScriptOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isImportLoading, setIsImportLoading] = useState(false);
    const [prefilledImport, setPrefilledImport] = useState<ScriptImportFile | null>(null);
    const [scriptToDelete, setScriptToDelete] = useState<ScriptToDelete | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [scriptToRename, setScriptToRename] = useState<ScriptToRename | null>(null);
    const [isRenaming, setIsRenaming] = useState(false);
    const [scriptToDuplicate, setScriptToDuplicate] = useState<ScriptToDuplicate | null>(null);
    const [isDuplicating, setIsDuplicating] = useState(false);

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

    const openDeleteScript = useCallback((script: ScriptToDelete) => {
        setScriptToDelete(script);
    }, []);

    const closeDeleteScript = useCallback(() => {
        if (isDeleting) {
            return;
        }

        setScriptToDelete(null);
    }, [isDeleting]);

    const openRenameScript = useCallback((script: ScriptToRename) => {
        setScriptToRename(script);
    }, []);

    const closeRenameScript = useCallback(() => {
        if (isRenaming) {
            return;
        }

        setScriptToRename(null);
    }, [isRenaming]);

    const openDuplicateScript = useCallback((script: ScriptToDuplicate) => {
        setScriptToDuplicate(script);
    }, []);

    const closeDuplicateScript = useCallback(() => {
        if (isDuplicating) {
            return;
        }

        setScriptToDuplicate(null);
    }, [isDuplicating]);

    const createScriptWithActiveBlock = useCallback(async (name: string, initialContent?: ScriptDocument) => {
        const scriptId = await scriptRepository.createScript(name, initialContent);
        const activeBlockId = initialContent
            ? getFirstBlockId(initialContent)
            : createNodeId();

        if (activeBlockId) {
            await scriptRepository.setActiveBlock(scriptId, activeBlockId);
        }

        refreshScripts();

        return scriptId;
    }, [refreshScripts, scriptRepository]);

    const handleCreate = useCallback((name: string): Promise<void> => {
        const createAndNavigate = async () => {
            try {
                const scriptId = await createScriptWithActiveBlock(name);

                setIsNewScriptOpen(false);
                void navigate(`/script/${scriptId}/editor`);
                addToast({
                    title: 'Script created',
                    description: trimOrFallback(name, 'Untitled script'),
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

        return createAndNavigate();
    }, [
        addToast,
        createScriptWithActiveBlock,
        navigate,
    ]);

    const handleImport = useCallback((payload: ScriptImportFile & {name: string}): Promise<void> => {
        const importAndNavigate = async () => {
            setIsImportLoading(true);

            try {
                const {scriptId, scriptName} = await importStagisticFile({
                    ...payload,
                    createScript: createScriptWithActiveBlock,
                    saveTitlePage: scriptRepository.saveTitlePage,
                    rollbackScript: async id => {
                        await scriptRepository.deleteScript(id);
                        refreshScripts();
                    },
                });

                setIsImportOpen(false);
                setPrefilledImport(null);
                void navigate(`/script/${scriptId}/editor`);
                addToast({
                    title: 'Script imported',
                    description: scriptName,
                    variant: 'success',
                });
            } catch (error) {
                console.error('Failed to import script', error);
                addToast({
                    title: 'Failed to import script',
                    description: error instanceof Error ? error.message : 'Please check the file and try again.',
                    variant: 'error',
                });
            } finally {
                setIsImportLoading(false);
            }
        };

        return importAndNavigate();
    }, [
        addToast,
        createScriptWithActiveBlock,
        navigate,
        refreshScripts,
        scriptRepository,
    ]);

    const handleDelete = useCallback((): Promise<void> => {
        const deleteAndRefresh = async () => {
            if (!scriptToDelete) {
                return;
            }

            setIsDeleting(true);

            try {
                await scriptRepository.deleteScript(scriptToDelete.id);
                refreshScripts();
                setScriptToDelete(null);
                addToast({
                    title: 'Script deleted',
                    description: `"${scriptToDelete.title}" has been permanently deleted.`,
                    variant: 'success',
                });
            } catch (error) {
                console.error('Failed to delete script', error);
                addToast({
                    title: 'Failed to delete script',
                    description: error instanceof Error ? error.message : 'An unexpected error occurred.',
                    variant: 'error',
                });
            } finally {
                setIsDeleting(false);
            }
        };

        return deleteAndRefresh();
    }, [
        addToast,
        refreshScripts,
        scriptRepository,
        scriptToDelete,
    ]);

    const handleRename = useCallback((values: {title: string, subtitle: string}): Promise<void> => {
        const renameAndRefresh = async () => {
            if (!scriptToRename) {
                return;
            }

            setIsRenaming(true);

            try {
                await scriptRepository.renameScript(scriptToRename.id, {
                    title: values.title,
                    subtitle: values.subtitle,
                });
                refreshScripts();
                setScriptToRename(null);
                addToast({
                    title: 'Script renamed',
                    description: trimOrFallback(values.title, 'Untitled script'),
                    variant: 'success',
                });
            } catch (error) {
                console.error('Failed to rename script', error);
                addToast({
                    title: 'Failed to rename script',
                    description: error instanceof Error ? error.message : 'An unexpected error occurred.',
                    variant: 'error',
                });
            } finally {
                setIsRenaming(false);
            }
        };

        return renameAndRefresh();
    }, [
        addToast,
        refreshScripts,
        scriptRepository,
        scriptToRename,
    ]);

    const handleDuplicate = useCallback((values: {
        title: string,
        copySettings: boolean,
        copyAttributes: boolean,
        openInEditor: boolean,
    }): Promise<void> => {
        const duplicateAndRefresh = async () => {
            if (!scriptToDuplicate) {
                return;
            }

            setIsDuplicating(true);

            try {
                const newScriptId = await scriptRepository.duplicateScript(scriptToDuplicate.id, {
                    title: values.title,
                    copySettings: values.copySettings,
                    copyAttributes: values.copyAttributes,
                });

                refreshScripts();
                setScriptToDuplicate(null);
                addToast({
                    title: 'Script duplicated',
                    description: trimOrFallback(values.title, 'Untitled script'),
                    variant: 'success',
                });

                if (values.openInEditor) {
                    void navigate(`/script/${newScriptId}/editor`);
                }
            } catch (error) {
                console.error('Failed to duplicate script', error);
                addToast({
                    title: 'Failed to duplicate script',
                    description: error instanceof Error ? error.message : 'An unexpected error occurred.',
                    variant: 'error',
                });
            } finally {
                setIsDuplicating(false);
            }
        };

        return duplicateAndRefresh();
    }, [
        addToast,
        navigate,
        refreshScripts,
        scriptRepository,
        scriptToDuplicate,
    ]);

    return useMemo(() => ({
        isNewScriptOpen,
        isImportOpen,
        prefilledImport,
        isImportLoading,
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
        openImportScript,
        closeImportScript,
        openDeleteScript,
        closeDeleteScript,
        openRenameScript,
        closeRenameScript,
        openDuplicateScript,
        closeDuplicateScript,
        setPrefilledImport,
        handleCreate,
        handleImport,
        handleDelete,
        handleRename,
        handleDuplicate,
    }), [
        closeDeleteScript,
        closeDuplicateScript,
        closeImportScript,
        closeNewScript,
        closeRenameScript,
        handleCreate,
        handleDelete,
        handleDuplicate,
        handleImport,
        handleRename,
        isDeleting,
        isDuplicating,
        isImportLoading,
        isImportOpen,
        isNewScriptOpen,
        isRenaming,
        openDeleteScript,
        openDuplicateScript,
        openImportScript,
        openNewScript,
        openRenameScript,
        scriptToDuplicate,
        scriptToRename,
        prefilledImport,
        scriptToDelete,
    ]);
};
