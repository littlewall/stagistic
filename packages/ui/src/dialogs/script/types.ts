import type {ImportPayload} from './import/model';
import type {ImportScriptFile, StepkgPeekResult} from './import/types';

export type NewScriptShape = 'multi-act' | 'one-act';

export interface NewScriptModalProps {
    isOpen: boolean,
    isTransitioning?: boolean,
    onClose: () => void,
    onCreate: (name: string, shape: NewScriptShape) => void | Promise<void>,
}

export interface ImportScriptModalProps {
    isOpen: boolean,
    onClose: () => void,
    onImportStagistic: (payload: ImportPayload) => void | Promise<void>,
    onImportStepkgAsNew: (payload: {
        fileName: string,
        bytes: Uint8Array,
        title: string,
    }) => void | Promise<void>,
    onReplaceWithStepkg: (payload: {fileName: string, bytes: Uint8Array}) => void | Promise<void>,
    onDownloadStepkgBackup: (scriptId: string) => void | Promise<void>,
    onPeekStepkg: (bytes: Uint8Array) => Promise<StepkgPeekResult>,
    onPickFile?: () => Promise<ImportScriptFile | null>,
    preselectedFile?: ImportScriptFile | null,
    isLoading?: boolean,
    isDownloadingBackup?: boolean,
}
