import type {ScriptRepository} from '@stagistic/app-core';
import type {
    ScriptDocument,
    ScriptFormatSelection,
    TitlePageSettings,
} from '@stagistic/script';
import type {
    NewScriptFormatSelection,
    NewScriptShape,
    StepkgPeekResult,
} from '@stagistic/ui';
import type {RefObject} from 'react';
import type {NavigateFunction} from 'react-router-dom';

import type {AppToastPayload} from '../routes/script/workspace/types';

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

export interface ScriptActionsAdapter {
    createScript: (name: string, initialContent?: ScriptDocument, format?: ScriptFormatSelection) => Promise<string>,
    renameScript: (scriptId: string, input: {title: string, subtitle: string | null}) => Promise<void>,
    duplicateScript: (
        sourceScriptId: string,
        input: {
            title: string,
            copySettings: boolean,
            copyAttributes: boolean,
        },
    ) => Promise<string>,
    deleteScript: (scriptId: string) => Promise<void>,
}

export interface UseGlobalModalActionsArgs {
    scriptActions: ScriptActionsAdapter,
    repository: ScriptRepository,
    saveTitlePage: (scriptId: string, settings: TitlePageSettings) => Promise<void>,
    navigation: {
        navigate: NavigateFunction,
    },
    notifications: {
        addToast: (toast: AppToastPayload) => void,
    },
}

export interface GlobalModalActions {
    newScriptReturnFocus: RefObject<HTMLElement | null>,
    importScriptReturnFocus: RefObject<HTMLElement | null>,
    deleteScriptReturnFocus: RefObject<HTMLElement | null>,
    renameScriptReturnFocus: RefObject<HTMLElement | null>,
    duplicateScriptReturnFocus: RefObject<HTMLElement | null>,
    isNewScriptOpen: boolean,
    newScriptTransitionPath: string | null,
    isImportOpen: boolean,
    prefilledImport: ScriptImportFile | null,
    isImportLoading: boolean,
    isDownloadingBackup: boolean,
    scriptToDelete: ScriptToDelete | null,
    isDeleteScriptOpen: boolean,
    isDeleting: boolean,
    scriptToRename: ScriptToRename | null,
    isRenameScriptOpen: boolean,
    isRenaming: boolean,
    scriptToDuplicate: ScriptToDuplicate | null,
    isDuplicateScriptOpen: boolean,
    isDuplicating: boolean,
    openNewScript: (returnFocus?: HTMLElement | null) => void,
    closeNewScript: () => void,
    completeNewScriptTransition: () => void,
    openImportScript: (returnFocus?: HTMLElement | null) => void,
    closeImportScript: () => void,
    openDeleteScript: (script: ScriptToDelete, returnFocus?: HTMLElement | null) => void,
    closeDeleteScript: () => void,
    openRenameScript: (script: ScriptToRename, returnFocus?: HTMLElement | null) => void,
    closeRenameScript: () => void,
    openDuplicateScript: (script: ScriptToDuplicate, returnFocus?: HTMLElement | null) => void,
    closeDuplicateScript: () => void,
    setPrefilledImport: (value: ScriptImportFile | null) => void,
    handleCreate: (name: string, shape: NewScriptShape, format?: NewScriptFormatSelection) => Promise<void>,
    handleImportStagistic: (payload: ScriptImportFile & {name: string}) => Promise<void>,
    handlePeekStepkg: (bytes: Uint8Array) => Promise<StepkgPeekResult>,
    handleImportStepkgAsNew: (payload: {
        fileName: string,
        bytes: Uint8Array,
        title: string,
    }) => Promise<void>,
    handleReplaceWithStepkg: (payload: {fileName: string, bytes: Uint8Array}) => Promise<void>,
    handleDownloadStepkgBackup: (scriptId: string) => Promise<void>,
    handleDelete: () => Promise<void>,
    handleRename: (values: {title: string, subtitle: string}) => Promise<void>,
    handleDuplicate: (values: {
        title: string,
        copySettings: boolean,
        copyAttributes: boolean,
        openInEditor: boolean,
    }) => Promise<void>,
}
