import {trimOrFallback} from '@stagistic/script';
import {
    type Dispatch,
    type SetStateAction,
    useCallback,
    useMemo,
} from 'react';

import type {AppToastPayload} from '../../routes/script/types';
import type {
    ScriptImportFile,
    ScriptToDelete,
    ScriptToDuplicate,
    ScriptToRename,
    UseGlobalModalActionsArgs,
} from './globalModalTypes';
import {importStagisticFile} from './importStagisticFile';

interface UseGlobalModalMutationsArgs extends Pick<
    UseGlobalModalActionsArgs,
    'saveTitlePage' | 'scriptActions'
> {
    navigate: UseGlobalModalActionsArgs['navigation']['navigate'],
    addToast: (toast: AppToastPayload) => void,
    scriptToDelete: ScriptToDelete | null,
    scriptToRename: ScriptToRename | null,
    scriptToDuplicate: ScriptToDuplicate | null,
    setIsNewScriptOpen: Dispatch<SetStateAction<boolean>>,
    setIsImportOpen: Dispatch<SetStateAction<boolean>>,
    setIsImportLoading: Dispatch<SetStateAction<boolean>>,
    setPrefilledImport: Dispatch<SetStateAction<ScriptImportFile | null>>,
    setScriptToDelete: Dispatch<SetStateAction<ScriptToDelete | null>>,
    setIsDeleting: Dispatch<SetStateAction<boolean>>,
    setScriptToRename: Dispatch<SetStateAction<ScriptToRename | null>>,
    setIsRenaming: Dispatch<SetStateAction<boolean>>,
    setScriptToDuplicate: Dispatch<SetStateAction<ScriptToDuplicate | null>>,
    setIsDuplicating: Dispatch<SetStateAction<boolean>>,
}

export const useGlobalModalMutations = ({
    scriptActions,
    saveTitlePage,
    navigate,
    addToast,
    scriptToDelete,
    scriptToRename,
    scriptToDuplicate,
    setIsNewScriptOpen,
    setIsImportOpen,
    setIsImportLoading,
    setPrefilledImport,
    setScriptToDelete,
    setIsDeleting,
    setScriptToRename,
    setIsRenaming,
    setScriptToDuplicate,
    setIsDuplicating,
}: UseGlobalModalMutationsArgs) => {
    const handleCreate = useCallback(async (name: string) => {
        try {
            const scriptId = await scriptActions.createScript(name);

            setIsNewScriptOpen(false);
            void navigate(`/script/${scriptId}/editor`);
            addToast({
                title: 'Script created',
                description: trimOrFallback(name, 'Untitled script'),
                variant: 'success',
            });
        } catch {
            console.error('Failed to create script');
            addToast({
                title: 'Failed to create script',
                description: 'Please try again.',
                variant: 'error',
            });
        }
    }, [
        addToast,
        navigate,
        scriptActions,
        setIsNewScriptOpen,
    ]);
    const handleImport = useCallback(async (payload: ScriptImportFile & {name: string}) => {
        setIsImportLoading(true);

        try {
            const {scriptId, scriptName} = await importStagisticFile({
                ...payload,
                createScript: scriptActions.createScript,
                saveTitlePage,
                rollbackScript: id => scriptActions.deleteScript(id),
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
            console.error('Failed to import script');
            addToast({
                title: 'Failed to import script',
                description: error instanceof Error
                    ? error.message
                    : 'Please check the file and try again.',
                variant: 'error',
            });
        } finally {
            setIsImportLoading(false);
        }
    }, [
        addToast,
        navigate,
        saveTitlePage,
        scriptActions,
        setIsImportLoading,
        setIsImportOpen,
        setPrefilledImport,
    ]);
    const handleDelete = useCallback(async () => {
        if (!scriptToDelete) {
            return;
        }

        setIsDeleting(true);

        try {
            await scriptActions.deleteScript(scriptToDelete.id);
            setScriptToDelete(null);
            addToast({
                title: 'Script deleted',
                description: `"${scriptToDelete.title}" has been permanently deleted.`,
                variant: 'success',
            });
        } catch (error) {
            console.error('Failed to delete script');
            addToast({
                title: 'Failed to delete script',
                description: error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred.',
                variant: 'error',
            });
        } finally {
            setIsDeleting(false);
        }
    }, [
        addToast,
        scriptActions,
        scriptToDelete,
        setIsDeleting,
        setScriptToDelete,
    ]);
    const handleRename = useCallback(async (values: {title: string, subtitle: string}) => {
        if (!scriptToRename) {
            return;
        }

        setIsRenaming(true);

        try {
            await scriptActions.renameScript(scriptToRename.id, {
                title: values.title,
                subtitle: values.subtitle,
            });
            setScriptToRename(null);
            addToast({
                title: 'Script renamed',
                description: trimOrFallback(values.title, 'Untitled script'),
                variant: 'success',
            });
        } catch (error) {
            console.error('Failed to rename script');
            addToast({
                title: 'Failed to rename script',
                description: error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred.',
                variant: 'error',
            });
        } finally {
            setIsRenaming(false);
        }
    }, [
        addToast,
        scriptActions,
        scriptToRename,
        setIsRenaming,
        setScriptToRename,
    ]);
    const handleDuplicate = useCallback(async (values: {
        title: string,
        copySettings: boolean,
        copyAttributes: boolean,
        openInEditor: boolean,
    }) => {
        if (!scriptToDuplicate) {
            return;
        }

        setIsDuplicating(true);

        try {
            const newScriptId = await scriptActions.duplicateScript(scriptToDuplicate.id, {
                title: values.title,
                copySettings: values.copySettings,
                copyAttributes: values.copyAttributes,
            });

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
            console.error('Failed to duplicate script');
            addToast({
                title: 'Failed to duplicate script',
                description: error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred.',
                variant: 'error',
            });
        } finally {
            setIsDuplicating(false);
        }
    }, [
        addToast,
        navigate,
        scriptActions,
        scriptToDuplicate,
        setIsDuplicating,
        setScriptToDuplicate,
    ]);

    return useMemo(() => ({
        handleCreate,
        handleImport,
        handleDelete,
        handleRename,
        handleDuplicate,
    }), [
        handleCreate,
        handleDelete,
        handleDuplicate,
        handleImport,
        handleRename,
    ]);
};
