import type {
    ScriptDocument,
    TitlePageSettings,
} from '@stagistic/script';
import type {NavigateFunction} from 'react-router-dom';

import type {AppToastPayload} from '../../routes/script/types';

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
    createScript: (name: string, initialContent?: ScriptDocument) => Promise<string>,
    renameScript: (
        scriptId: string,
        input: {title: string, subtitle: string | null},
    ) => Promise<void>,
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
    saveTitlePage: (scriptId: string, settings: TitlePageSettings) => Promise<void>,
    navigation: {
        navigate: NavigateFunction,
    },
    notifications: {
        addToast: (toast: AppToastPayload) => void,
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
