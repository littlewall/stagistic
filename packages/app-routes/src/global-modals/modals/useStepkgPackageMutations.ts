import {
    exportScriptPackage,
    importScriptPackageAsNew,
    peekStepkgPackage,
    restoreScriptPackage,
} from '@stagistic/app-core';
import {useCallback} from 'react';

import {downloadBlob} from '../../routes/script/downloadStagistic';
import type {UseGlobalModalMutationsArgs} from './useGlobalModalMutations';

const PEEK_ERROR_MESSAGES: Record<string, string> = {
    not_a_zip: 'This file isn\'t a valid Stagistic package.',
    manifest_invalid: 'This file isn\'t a valid Stagistic package.',
    unsupported_format_version: 'This package was created by an incompatible version of Stagistic.',
    unsupported_document_schema_version: 'This package was created by a newer version of Stagistic. Update the app to import it.',
};
const DEFAULT_PEEK_ERROR = 'This file isn\'t a valid Stagistic package.';
const PACKAGE_SUBMIT_ERROR = 'This package appears to be corrupted or incomplete. Try exporting it again.';

type UseStepkgPackageMutationsArgs = Pick<
    UseGlobalModalMutationsArgs,
    'repository' | 'navigate' | 'addToast' | 'setIsImportOpen' | 'setIsImportLoading' | 'setIsDownloadingBackup' | 'setPrefilledImport'
>;

/** Peek, import-as-new, replace and backup handlers for .stepkg packages. */
export const useStepkgPackageMutations = ({
    repository,
    navigate,
    addToast,
    setIsImportOpen,
    setIsImportLoading,
    setIsDownloadingBackup,
    setPrefilledImport,
}: UseStepkgPackageMutationsArgs) => {
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
        async (payload: {
            fileName: string,
            bytes: Uint8Array,
            title: string,
        }) => {
            setIsImportLoading(true);

            try {
                const result = await importScriptPackageAsNew({
                    repository,
                    bytes: payload.bytes,
                    title: payload.title,
                });

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
        [
            addToast,
            navigate,
            repository,
            setIsImportLoading,
            setIsImportOpen,
            setPrefilledImport,
        ],
    );
    const handleReplaceWithStepkg = useCallback(
        async (payload: {fileName: string, bytes: Uint8Array}) => {
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
        [
            addToast,
            navigate,
            repository,
            setIsImportLoading,
            setIsImportOpen,
            setPrefilledImport,
        ],
    );
    const handleDownloadStepkgBackup = useCallback(
        async (scriptId: string) => {
            setIsDownloadingBackup(true);

            try {
                const result = await exportScriptPackage({
                    repository,
                    scriptId,
                    generator: {name: 'Stagistic', version: 'web'},
                });

                if (result.ok) {
                    downloadBlob(result.fileName, result.blob);
                }
            } finally {
                setIsDownloadingBackup(false);
            }
        },
        [repository, setIsDownloadingBackup],
    );

    return {
        handlePeekStepkg,
        handleImportStepkgAsNew,
        handleReplaceWithStepkg,
        handleDownloadStepkgBackup,
    };
};
