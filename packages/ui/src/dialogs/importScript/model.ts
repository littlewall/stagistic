import {isObjectRecord} from '@stagistic/script-core';

export type ImportPayload = {
    name: string,
    fileName: string,
    text: string,
};

export type SelectedFile = {
    name: string,
    file?: File,
    text?: string,
};

export type DropEvent = {
    items: readonly unknown[],
};

type FileDropItem = {
    kind: 'file',
    name: string,
    getFile: () => Promise<File>,
};

export const isFileDropItem = (item: unknown): item is FileDropItem => {
    if (!isObjectRecord(item)) {
        return false;
    }

    return item.kind === 'file'
        && typeof item.name === 'string'
        && typeof item.getFile === 'function';
};

export const isFountainFileName = (name: string) => {
    return name.toLowerCase().endsWith('.fountain');
};

export const getFileBaseName = (name: string) => {
    return name.replace(/\.fountain$/i, '');
};
