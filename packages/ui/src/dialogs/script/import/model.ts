export interface ImportPayload {
    name: string;
    fileName: string;
    text: string;
}

export type SelectedFile = {kind: 'stagistic'; name: string; file?: File; text?: string} | {kind: 'stepkg'; name: string; file?: File; bytes?: Uint8Array};

export interface DropEvent {
    items: readonly unknown[];
}

interface FileDropItem {
    kind: 'file';
    name: string;
    getFile: () => Promise<File>;
}

export const isFileDropItem = (item: unknown): item is FileDropItem => {
    if (typeof item !== 'object' || item === null) {
        return false;
    }

    const candidate = item as Record<string, unknown>;

    return candidate.kind === 'file' && typeof candidate.name === 'string' && typeof candidate.getFile === 'function';
};

export const isStagisticFileName = (name: string) => {
    return name.toLowerCase().endsWith('.stagistic');
};

export const isStepkgFileName = (name: string) => {
    return name.toLowerCase().endsWith('.stepkg');
};

export const classifyFileKind = (name: string): 'stagistic' | 'stepkg' | null => {
    if (isStagisticFileName(name)) return 'stagistic';
    if (isStepkgFileName(name)) return 'stepkg';
    return null;
};

export const getFileBaseName = (name: string) => {
    return name.replace(/\.(stagistic|stepkg)$/i, '');
};
