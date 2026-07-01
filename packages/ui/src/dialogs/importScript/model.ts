export interface ImportPayload {
    name: string,
    fileName: string,
    text: string,
}

export interface SelectedFile {
    name: string,
    file?: File,
    text?: string,
}

export interface DropEvent {
    items: readonly unknown[],
}

interface FileDropItem {
    kind: 'file',
    name: string,
    getFile: () => Promise<File>,
}

export const isFileDropItem = (item: unknown): item is FileDropItem => {
    if (typeof item !== 'object' || item === null) {
        return false;
    }

    const candidate = item as Record<string, unknown>;

    return candidate.kind === 'file'
        && typeof candidate.name === 'string'
        && typeof candidate.getFile === 'function';
};

export const isStagisticFileName = (name: string) => {
    return name.toLowerCase().endsWith('.stagistic');
};

export const getFileBaseName = (name: string) => {
    return name.replace(/\.stagistic$/i, '');
};
