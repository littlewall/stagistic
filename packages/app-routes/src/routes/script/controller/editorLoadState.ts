import type {EditorLoadState} from './types';

type EditorLoadItemStatus = 'error' | 'active' | 'done' | 'pending';

type ResolveEditorLoadItemStatusArgs = {
    hasError: boolean,
    isActive: boolean,
    isDone: boolean,
    fallback?: EditorLoadItemStatus,
};

type DeriveEditorLoadStateArgs = {
    recentScriptsError: unknown,
    recentScriptsLoading: boolean,
    currentScriptError: unknown,
    currentScriptLoading: boolean,
    storageError: string | null,
    isContentLoading: boolean,
    initialValueLoaded: boolean,
    scriptsLoading: boolean,
    scriptId: string | undefined,
};

const resolveEditorLoadItemStatus = ({
    hasError,
    isActive,
    isDone,
    fallback = 'pending',
}: ResolveEditorLoadItemStatusArgs): EditorLoadItemStatus => {
    if (hasError) {
        return 'error';
    }

    if (isActive) {
        return 'active';
    }

    if (isDone) {
        return 'done';
    }

    return fallback;
};

export const deriveEditorLoadState = ({
    recentScriptsError,
    recentScriptsLoading,
    currentScriptError,
    currentScriptLoading,
    storageError,
    isContentLoading,
    initialValueLoaded,
    scriptsLoading,
    scriptId,
}: DeriveEditorLoadStateArgs): EditorLoadState => {
    const items = [
        {
            label: 'Loading scripts',
            status: resolveEditorLoadItemStatus({
                hasError: Boolean(recentScriptsError),
                isActive: recentScriptsLoading,
                isDone: true,
            }),
        },
        {
            label: 'Loading script metadata',
            status: resolveEditorLoadItemStatus({
                hasError: Boolean(currentScriptError),
                isActive: currentScriptLoading,
                isDone: Boolean(scriptId),
            }),
        },
        {
            label: 'Loading script content',
            status: resolveEditorLoadItemStatus({
                hasError: Boolean(storageError),
                isActive: isContentLoading,
                isDone: initialValueLoaded,
            }),
        },
        {
            label: 'Loading editor settings',
            status: resolveEditorLoadItemStatus({
                hasError: Boolean(storageError),
                isActive: false,
                isDone: true,
            }),
        },
    ] as const;

    const score = (status: typeof items[number]['status']) => {
        if (status === 'done') {
            return 1;
        }

        if (status === 'active') {
            return 0.5;
        }

        return 0;
    };
    const progress = items.reduce((sum, item) => sum + score(item.status), 0) / items.length;
    const statusText = items.find(item => item.status === 'active')?.label
        ?? items.find(item => item.status === 'error')?.label
        ?? 'Preparing editor';

    return {
        progress,
        statusText,
        isLoading: scriptsLoading || isContentLoading,
    };
};
