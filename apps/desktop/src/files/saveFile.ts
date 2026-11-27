import type {SaveFile} from '@stagistic/app-routes';
import {save} from '@tauri-apps/plugin-dialog';
import {writeFile} from '@tauri-apps/plugin-fs';

interface SaveFileDeps {
    /** Native Save dialog; resolves to the chosen path or null on cancel. */
    pickPath: (suggestedName: string) => Promise<string | null>,
    write: (path: string, bytes: Uint8Array) => Promise<void>,
    onError: (error: unknown) => void,
}

const extensionOf = (name: string) => {
    const dot = name.lastIndexOf('.');

    return dot > 0 ? name.slice(dot + 1) : null;
};

/*
 * Mac app: native Save dialog, then a write to the chosen path. The dialog
 * plugin adds only that one path to the fs scope, so no static write scope is
 * needed. Cancel resolves quietly; a failed write is shown to the writer.
 */
export const createSaveFile = ({
    pickPath,
    write,
    onError,
}: SaveFileDeps): SaveFile => async ({data, suggestedName}) => {
    const path = await pickPath(suggestedName);

    if (!path) {
        return;
    }

    try {
        const bytes = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : data;

        await write(path, bytes);
    } catch (error) {
        onError(error);
    }
};

export const saveFileWithDialog = createSaveFile({
    pickPath: suggestedName => {
        const extension = extensionOf(suggestedName);

        return save({
            defaultPath: suggestedName,
            filters: extension ? [{name: extension.toUpperCase(), extensions: [extension]}] : undefined,
        });
    },
    write: (path, bytes) => writeFile(path, bytes),
    onError: error => {
        window.alert(`Stagistic could not save the file: ${error instanceof Error ? error.message : String(error)}`);
    },
});
