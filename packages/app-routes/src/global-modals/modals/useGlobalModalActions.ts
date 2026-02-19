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

type ScriptRepositoryAdapter = {
    createScript: (name: string, initialContent?: ScriptDocument) => Promise<string>,
    setActiveBlock: (scriptId: string, blockId: string | null) => Promise<void>,
};

type UseGlobalModalActionsArgs = {
    scriptRepository: ScriptRepositoryAdapter,
    refreshScripts: () => void,
    navigate: NavigateFunction,
    addToast: (toast: AppToastPayload) => void,
    pickFile: () => Promise<{fileName: string, text: string} | null>,
};

export type GlobalModalActions = {
    isNewScriptOpen: boolean,
    isImportOpen: boolean,
    prefilledImport: {fileName: string, text: string} | null,
    openNewScript: () => void,
    closeNewScript: () => void,
    openImportScript: () => void,
    closeImportScript: () => void,
    setPrefilledImport: (value: {fileName: string, text: string} | null) => void,
    handleCreate: (name: string) => void,
    handleImport: (payload: {
        name: string, fileName: string, text: string,
    }) => void,
    pickImportFile: () => Promise<{fileName: string, text: string} | null>,
};

export const useGlobalModalActions = ({
    scriptRepository,
    refreshScripts,
    navigate,
    addToast,
    pickFile,
}: UseGlobalModalActionsArgs): GlobalModalActions => {
    const [isNewScriptOpen, setIsNewScriptOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [prefilledImport, setPrefilledImport] = useState<{fileName: string, text: string} | null>(null);

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

    const handleImport = useCallback((payload: {
        name: string,
        fileName: string,
        text: string,
    }) => {
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
