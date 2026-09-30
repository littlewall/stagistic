import type {DropEvent, ImportPayload} from './model';

export interface ImportScriptFile {
    fileName: string;
    text: string;
}

export type StepkgPeekResult = {ok: true; scriptId: string; packageTitle: string; existingLocalTitle: string | null} | {ok: false; message: string};

export interface ImportDropZoneProps {
    fileLabel: string;
    hint: string;
    isFileSelected?: boolean;
    acceptedExtensions: readonly string[];
    onDrop: (event: DropEvent) => void;
    onFileSelect: (files: FileList | null) => void;
    onPickFile?: () => void | Promise<void>;
}

export interface UseImportScriptModalStateArgs {
    isOpen: boolean;
    onImportStagistic: (payload: ImportPayload) => void | Promise<void>;
    onImportStepkgAsNew: (payload: {fileName: string; bytes: Uint8Array; title: string}) => void | Promise<void>;
    onReplaceWithStepkg: (payload: {fileName: string; bytes: Uint8Array}) => void | Promise<void>;
    onDownloadStepkgBackup: (scriptId: string) => void | Promise<void>;
    onPeekStepkg: (bytes: Uint8Array) => Promise<StepkgPeekResult>;
    onPickFile?: () => Promise<ImportScriptFile | null>;
    preselectedFile?: ImportScriptFile | null;
}
