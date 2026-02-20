import type {ScriptImportFile} from '@stagistic/platform-core';
import {
    createNodeId,
    getFirstBlockId,
    type ScriptDocument,
    trimOrFallback,
} from '@stagistic/script-core';
import {
    useCallback,
    useMemo,
    useState,
} from 'react';
import {type NavigateFunction} from 'react-router-dom';

import type {AppToastPayload} from '../../routes/script/types';
import {
    isSupportedImportFileName,
    parseImportedFountainScript,
    resolveImportedScriptName,
} from '../services/scriptImportService';

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
    requests: {
        pickFile: () => Promise<ScriptImportFile | null>,
    },
}

export interface GlobalModalActions {
    isNewScriptOpen: boolean,
    isImportOpen: boolean,
    prefilledImport: ScriptImportFile | null,
    openNewScript: () => void,
    closeNewScript: () => void,
    openImportScript: () => void,
    closeImportScript: () => void,
    setPrefilledImport: (value: ScriptImportFile | null) => void,
    handleCreate: (name: string) => void,
    handleImport: (payload: ScriptImportFile & {name: string}) => void,
    pickImportFile: () => Promise<ScriptImportFile | null>,
}

export const useGlobalModalActions = ({
    repository,
    navigation,
    notifications,
    state,
    requests,
}: UseGlobalModalActionsArgs): GlobalModalActions => {
    const {scriptRepository} = repository;
    const {navigate} = navigation;
    const {addToast} = notifications;
    const {refreshScripts} = state;
    const {pickFile} = requests;
    const [isNewScriptOpen, setIsNewScriptOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
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

    const handleCreate = useCallback((name: string) => {
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

        void createAndNavigate();
    }, [
        addToast,
        createScriptWithActiveBlock,
        navigate,
    ]);

    const handleImport = useCallback((payload: ScriptImportFile & {name: string}) => {
        const importAndNavigate = async () => {
            try {
                if (!isSupportedImportFileName(payload.fileName)) {
                    addToast({
                        title: 'Unsupported file',
                        description: 'Only .fountain files can be imported.',
                        variant: 'error',
                    });

                    return;
                }

                const normalized = parseImportedFountainScript(payload.text);
                const resolvedName = resolveImportedScriptName(payload.name, payload.fileName);
                const scriptId = await createScriptWithActiveBlock(
                    resolvedName,
                    normalized,
                );

                setIsImportOpen(false);
                void navigate(`/script/${scriptId}/editor`);
                addToast({
                    title: 'Script imported',
                    description: resolvedName,
                    variant: 'success',
                });
            } catch (error) {
                console.error('Failed to import script', error);
                addToast({
                    title: 'Failed to import script',
                    description: 'Please try again.',
                    variant: 'error',
                });
            }
        };

        void importAndNavigate();
    }, [
        addToast,
        createScriptWithActiveBlock,
        navigate,
    ]);

    const pickImportFile = useCallback(async () => {
        return pickFile();
    }, [pickFile]);

    return useMemo(() => ({
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
    }), [
        closeImportScript,
        closeNewScript,
        handleCreate,
        handleImport,
        isImportOpen,
        isNewScriptOpen,
        openImportScript,
        openNewScript,
        pickImportFile,
        prefilledImport,
    ]);
};
