import type {
    DropEvent,
    ImportPayload,
} from './model';

export interface ImportScriptFile {
    fileName: string,
    text: string,
}

export interface ImportDropZoneProps {
    fileLabel: string,
    onDrop: (event: DropEvent) => void,
    onFileSelect: (files: FileList | null) => void,
    onPickFile?: () => void | Promise<void>,
}

export interface UseImportScriptModalStateArgs {
    isOpen: boolean,
    onImport: (payload: ImportPayload) => void | Promise<void>,
    onPickFile?: () => Promise<ImportScriptFile | null>,
    preselectedFile?: ImportScriptFile | null,
}
