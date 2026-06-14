import {
    createNodeId,
    getFirstBlockId,
    type ScriptDocument,
    trimOrFallback,
} from '@stagistic/script';
import {
    useCallback,
    useMemo,
    useState,
} from 'react';
import {type NavigateFunction} from 'react-router-dom';

import type {AppToastPayload} from '../../routes/script/types';

export interface ScriptImportFile {
    fileName: string,
    text: string,
}

interface ScriptRepositoryAdapter {
    createScript: (name: string, initialContent?: ScriptDocument) => Promise<string>,
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
    openNewScript: () => void,
    closeNewScript: () => void,
    openImportScript: () => void,
    closeImportScript: () => void,
    setPrefilledImport: (value: ScriptImportFile | null) => void,
    handleCreate: (name: string) => Promise<void>,
    handleImport: (payload: ScriptImportFile & {
        name: string,
        importOptions?: {
            enableLegacyCapsLyricsHeuristic?: boolean,
        },
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

    const handleImport = useCallback((payload: ScriptImportFile & {
        name: string,
        importOptions?: {
            enableLegacyCapsLyricsHeuristic?: boolean,
        },
    }): Promise<void> => {
        /*
         * Import parsing returns in phase 2 (new Stagistic syntax parser).
         * The import modal UI is preserved but the parse step is intentionally
         * a no-op until the parser is wired back in.
         */
        void payload;
        setIsImportLoading(false);
        setIsImportOpen(false);
        addToast({
            title: 'Import temporarily unavailable',
            description: 'Script import is being rebuilt and will return soon.',
            variant: 'error',
        });

        return Promise.resolve();
    }, [addToast]);

    return useMemo(() => ({
        isNewScriptOpen,
        isImportOpen,
        prefilledImport,
        isImportLoading,
        openNewScript,
        closeNewScript,
        openImportScript,
        closeImportScript,
        setPrefilledImport,
        handleCreate,
        handleImport,
    }), [
        closeImportScript,
        closeNewScript,
        handleCreate,
        handleImport,
        isImportLoading,
        isImportOpen,
        isNewScriptOpen,
        openImportScript,
        openNewScript,
        prefilledImport,
    ]);
};
