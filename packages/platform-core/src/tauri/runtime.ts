import type {ScriptImportFile} from './types';

interface TauriCoreModule {
    isTauri: () => boolean,
}

interface TauriEventModule {
    listen: <T>(
        event: string,
        handler: (payload: {payload: T}) => void,
    ) => Promise<() => void>,
}

interface TauriWebviewModule {
    getCurrentWebview: () => {
        onDragDropEvent: (
            handler: (event: {
                payload: {
                    type: string,
                    paths?: string[],
                },
            }) => void | Promise<void>,
        ) => Promise<() => void>,
    },
}

interface TauriFsModule {
    readTextFile: (path: string) => Promise<string>,
}

interface TauriDialogModule {
    open: (options: {
        multiple: boolean,
        filters: Array<{
            name: string,
            extensions: string[],
        }>,
    }) => Promise<string | string[] | null>,
}

export const isTauriRuntime = async () => {
    try {
        const {isTauri} = await import('@tauri-apps/api/core') as TauriCoreModule;

        return Boolean(isTauri());
    } catch {
        return false;
    }
};

export const listenTauriMenuAction = async (
    onAction: (action: string) => void,
): Promise<(() => void) | null> => {
    try {
        const {listen} = await import('@tauri-apps/api/event') as TauriEventModule;
        const stop = await listen<string>('menu-action', event => {
            onAction(event.payload);
        });

        return () => {
            stop();
        };
    } catch {
        return null;
    }
};

export const listenTauriFountainDrop = async (
    onDrop: (payload: ScriptImportFile) => void,
): Promise<(() => void) | null> => {
    try {
        const [{getCurrentWebview}, {readTextFile}] = await Promise.all([import('@tauri-apps/api/webview') as Promise<TauriWebviewModule>, import('@tauri-apps/plugin-fs') as Promise<TauriFsModule>]);
        const stop = await getCurrentWebview().onDragDropEvent(async event => {
            if (event.payload.type !== 'drop') {
                return;
            }

            const target = (event.payload.paths ?? []).find(path => path.toLowerCase().endsWith('.fountain'));

            if (!target) {
                return;
            }

            const text = await readTextFile(target);
            const fileName = target.split(/[/\\]/).pop() ?? 'Untitled.fountain';

            onDrop({fileName, text});
        });

        return () => {
            stop();
        };
    } catch {
        return null;
    }
};

export const pickTauriFountainFile = async (): Promise<ScriptImportFile | null> => {
    try {
        const [{open}, {readTextFile}] = await Promise.all([import('@tauri-apps/plugin-dialog') as Promise<TauriDialogModule>, import('@tauri-apps/plugin-fs') as Promise<TauriFsModule>]);
        const selected = await open({
            multiple: false,
            filters: [{name: 'Fountain', extensions: ['fountain']}],
        });

        if (!selected || Array.isArray(selected)) {
            return null;
        }

        const text = await readTextFile(selected);
        const fileName = selected.split(/[/\\]/).pop() ?? 'Untitled.fountain';

        return {
            fileName,
            text,
        };
    } catch {
        return null;
    }
};
