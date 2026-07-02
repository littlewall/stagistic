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

interface ScriptRepositoryAdapter {
    createScript: (name: string, initialContent?: ScriptDocument) => Promise<string>,
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
    openNewScript: () => void,
    closeNewScript: () => void,
    openImportScript: () => void,
    closeImportScript: () => void,
    openDeleteScript: (script: ScriptToDelete) => void,
    closeDeleteScript: () => void,
    setPrefilledImport: (value: ScriptImportFile | null) => void,
    handleCreate: (name: string) => Promise<void>,
    handleImport: (payload: ScriptImportFile & {name: string}) => Promise<void>,
    handleDelete: () => Promise<void>,
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

    return useMemo(() => ({
        isNewScriptOpen,
        isImportOpen,
        prefilledImport,
        isImportLoading,
        scriptToDelete,
        isDeleteScriptOpen: scriptToDelete !== null,
        isDeleting,
        openNewScript,
        closeNewScript,
        openImportScript,
        closeImportScript,
        openDeleteScript,
        closeDeleteScript,
        setPrefilledImport,
        handleCreate,
        handleImport,
        handleDelete,
    }), [
        closeDeleteScript,
        closeImportScript,
        closeNewScript,
        handleCreate,
        handleDelete,
        handleImport,
        isDeleting,
        isImportLoading,
        isImportOpen,
        isNewScriptOpen,
        openDeleteScript,
        openImportScript,
        openNewScript,
        prefilledImport,
        scriptToDelete,
    ]);
};
