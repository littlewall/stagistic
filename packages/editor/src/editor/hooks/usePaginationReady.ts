import type {Editor as TiptapEditor} from '@tiptap/core';
import {
    useCallback,
    useState,
    useSyncExternalStore,
} from 'react';

import {paginationKey} from '../tiptap/extensions/pagination/plugin/createPaginationPlugin';

const hasComputedPagination = (editor: TiptapEditor) => Boolean(
    paginationKey.getState(editor.state)?.hasComputed,
);

/**
 * True once the pagination plugin has dispatched its first measured layout.
 * Keeps the loader above the live canvas until pages, headers, and footers can
 * appear together instead of exposing the raw text flow first.
 */
export const usePaginationReady = (editor: TiptapEditor) => {
    const subscribe = useCallback((notify: () => void) => {
        editor.on('transaction', notify);

        return () => {
            editor.off('transaction', notify);
        };
    }, [editor]);
    const getSnapshot = useCallback(() => hasComputedPagination(editor), [editor]);

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

/** Like `usePaginationReady`, but stays true once the canvas has been presented. */
export const useInitialCanvasReady = (editor: TiptapEditor) => {
    const isPaginationReady = usePaginationReady(editor);
    const [hasPresentedCanvas, setHasPresentedCanvas] = useState(isPaginationReady);

    if (isPaginationReady && !hasPresentedCanvas) {
        setHasPresentedCanvas(true);
    }

    return hasPresentedCanvas || isPaginationReady;
};
