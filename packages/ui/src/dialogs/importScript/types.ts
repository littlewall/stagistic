import type {
    DropEvent,
    ImportPayload,
} from './model';

export interface ImportDropZoneProps {
    fileLabel: string,
    onDrop: (event: DropEvent) => void,
    onFileSelect: (files: FileList | null) => void,
    onPickFile?: () => void | Promise<void>,
}

export interface UseImportScriptModalStateArgs {
    isOpen: boolean,
    onClose: () => void,
    onImport: (payload: ImportPayload) => void,
    onPickFile?: () => Promise<{fileName: string, text: string} | null>,
    preselectedFile?: {fileName: string, text: string} | null,
}
