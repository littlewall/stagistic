import {exportScriptPackage, importScriptPackageAsNew, peekStepkgPackage, restoreScriptPackage} from '@stagistic/app-core';
import {trimOrFallback} from '@stagistic/script';
import type {NewScriptShape} from '@stagistic/ui';
import {type Dispatch, type SetStateAction, useCallback, useMemo} from 'react';

import {downloadBlob} from '../../routes/script/downloadStagistic';
import type {AppToastPayload} from '../../routes/script/types';
import type {ScriptImportFile, ScriptToDelete, ScriptToDuplicate, ScriptToRename, UseGlobalModalActionsArgs} from './globalModalTypes';
import {importStagisticFile} from './importStagisticFile';
import {createInitialScriptDocument} from './initialScriptDocument';

interface UseGlobalModalMutationsArgs extends Pick<UseGlobalModalActionsArgs, 'saveTitlePage' | 'scriptActions' | 'repository'> {
    navigate: UseGlobalModalActionsArgs['navigation']['navigate'];
    addToast: (toast: AppToastPayload) => void;
    scriptToDelete: ScriptToDelete | null;
    scriptToRename: ScriptToRename | null;
    scriptToDuplicate: ScriptToDuplicate | null;
    setNewScriptTransitionPath: Dispatch<SetStateAction<string | null>>;
    setIsImportOpen: Dispatch<SetStateAction<boolean>>;
    setIsImportLoading: Dispatch<SetStateAction<boolean>>;
    setIsDownloadingBackup: Dispatch<SetStateAction<boolean>>;
    setPrefilledImport: Dispatch<SetStateAction<ScriptImportFile | null>>;
    setScriptToDelete: Dispatch<SetStateAction<ScriptToDelete | null>>;
    setIsDeleting: Dispatch<SetStateAction<boolean>>;
    setScriptToRename: Dispatch<SetStateAction<ScriptToRename | null>>;
    setIsRenaming: Dispatch<SetStateAction<boolean>>;
    setScriptToDuplicate: Dispatch<SetStateAction<ScriptToDuplicate | null>>;
    setIsDuplicating: Dispatch<SetStateAction<boolean>>;
}

const PEEK_ERROR_MESSAGES: Record<string, string> = {
    not_a_zip: "This file isn't a valid Stagistic package.",
    manifest_invalid: "This file isn't a valid Stagistic package.",
    unsupported_format_version: 'This package was created by an incompatible version of Stagistic.',
    unsupported_document_schema_version: 'This package was created by a newer version of Stagistic. Update the app to import it.',
};
const DEFAULT_PEEK_ERROR = "This file isn't a valid Stagistic package.";
const PACKAGE_SUBMIT_ERROR = 'This package appears to be corrupted or incomplete. Try exporting it again.';

export const useGlobalModalMutations = ({
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
}: UseGlobalModalMutationsArgs) => {
    const handleCreate = useCallback(
        async (name: string, shape: NewScriptShape) => {
            try {
                const initialContent = createInitialScriptDocument(shape);
                const scriptId = await scriptActions.createScript(name, initialContent);
                const editorPath = `/script/${scriptId}/editor`;

                setNewScriptTransitionPath(editorPath);
                void navigate(editorPath);
                addToast({
                    title: 'Script created',
                    description: trimOrFallback(name, 'Untitled script'),
                    variant: 'success',
                });
            } catch {
                setNewScriptTransitionPath(null);
                console.error('Failed to create script');
                addToast({
                    title: 'Failed to create script',
                    description: 'Please try again.',
                    variant: 'error',
                });
            }
        },
        [addToast, navigate, scriptActions, setNewScriptTransitionPath],
    );
    const handleImportStagistic = useCallback(
        async (payload: ScriptImportFile & {name: string}) => {
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
                    description: error instanceof Error ? error.message : 'Please check the file and try again.',
                    variant: 'error',
                });
            } finally {
                setIsImportLoading(false);
            }
        },
        [addToast, navigate, saveTitlePage, scriptActions, setIsImportLoading, setIsImportOpen, setPrefilledImport],
    );
    const handlePeekStepkg = useCallback(
        async (bytes: Uint8Array) => {
            const result = await peekStepkgPackage({repository, bytes});

            if (!result.ok) {
                const code = result.issues[0]?.code;

                return {ok: false as const, message: (code && PEEK_ERROR_MESSAGES[code]) || DEFAULT_PEEK_ERROR};
            }

            return {
                ok: true as const,
                scriptId: result.scriptId,
                packageTitle: result.packageTitle,
                existingLocalTitle: result.existingScript?.title ?? null,
            };
        },
        [repository],
    );
    const handleImportStepkgAsNew = useCallback(
        async (payload: {fileName: string; bytes: Uint8Array; title: string}) => {
            setIsImportLoading(true);

            try {
                const result = await importScriptPackageAsNew({repository, bytes: payload.bytes, title: payload.title});

                if (!result.ok) {
                    throw new Error(PACKAGE_SUBMIT_ERROR);
                }

                setIsImportOpen(false);
                setPrefilledImport(null);
                void navigate(`/script/${result.scriptId}/editor`);
                addToast({
                    title: 'Script imported',
                    description: result.title,
                    variant: 'success',
                });
            } catch (error) {
                console.error('Failed to import script');
                addToast({
                    title: 'Failed to import script',
                    description: error instanceof Error ? error.message : 'Please check the file and try again.',
                    variant: 'error',
                });
            } finally {
                setIsImportLoading(false);
            }
        },
        [addToast, navigate, repository, setIsImportLoading, setIsImportOpen, setPrefilledImport],
    );
    const handleReplaceWithStepkg = useCallback(
        async (payload: {fileName: string; bytes: Uint8Array}) => {
            setIsImportLoading(true);

            try {
                const result = await restoreScriptPackage({repository, bytes: payload.bytes});

                if (!result.ok) {
                    throw new Error(PACKAGE_SUBMIT_ERROR);
                }

                setIsImportOpen(false);
                setPrefilledImport(null);
                void navigate(`/script/${result.scriptId}/editor`);
                addToast({
                    title: 'Script replaced',
                    description: result.title,
                    variant: 'success',
                });
            } catch (error) {
                console.error('Failed to replace script');
                addToast({
                    title: 'Failed to import script',
                    description: error instanceof Error ? error.message : 'Please check the file and try again.',
                    variant: 'error',
                });
            } finally {
                setIsImportLoading(false);
            }
        },
        [addToast, navigate, repository, setIsImportLoading, setIsImportOpen, setPrefilledImport],
    );
    const handleDownloadStepkgBackup = useCallback(
        async (scriptId: string) => {
            setIsDownloadingBackup(true);

            try {
                const result = await exportScriptPackage({repository, scriptId, generator: {name: 'Stagistic', version: 'web'}});

                if (result.ok) {
                    downloadBlob(result.fileName, result.blob);
                }
            } finally {
                setIsDownloadingBackup(false);
            }
        },
        [repository, setIsDownloadingBackup],
    );
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
                description: error instanceof Error ? error.message : 'An unexpected error occurred.',
                variant: 'error',
            });
        } finally {
            setIsDeleting(false);
        }
    }, [addToast, scriptActions, scriptToDelete, setIsDeleting, setScriptToDelete]);
    const handleRename = useCallback(
        async (values: {title: string; subtitle: string}) => {
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
                    description: error instanceof Error ? error.message : 'An unexpected error occurred.',
                    variant: 'error',
                });
            } finally {
                setIsRenaming(false);
            }
        },
        [addToast, scriptActions, scriptToRename, setIsRenaming, setScriptToRename],
    );
    const handleDuplicate = useCallback(
        async (values: {title: string; copySettings: boolean; copyAttributes: boolean; openInEditor: boolean}) => {
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
                    description: error instanceof Error ? error.message : 'An unexpected error occurred.',
                    variant: 'error',
                });
            } finally {
                setIsDuplicating(false);
            }
        },
        [addToast, navigate, scriptActions, scriptToDuplicate, setIsDuplicating, setScriptToDuplicate],
    );

    return useMemo(
        () => ({
            handleCreate,
            handleImportStagistic,
            handlePeekStepkg,
            handleImportStepkgAsNew,
            handleReplaceWithStepkg,
            handleDownloadStepkgBackup,
            handleDelete,
            handleRename,
            handleDuplicate,
        }),
        [
            handleCreate,
            handleDelete,
            handleDownloadStepkgBackup,
            handleDuplicate,
            handleImportStagistic,
            handleImportStepkgAsNew,
            handlePeekStepkg,
            handleRename,
            handleReplaceWithStepkg,
        ],
    );
};
