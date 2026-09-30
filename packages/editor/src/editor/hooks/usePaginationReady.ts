import type {Editor as TiptapEditor} from '@tiptap/core';
import {
    useEffect,
    useLayoutEffect,
    useState,
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
    const [, setRevision] = useState(0);
    const isReady = hasComputedPagination(editor);

    useEffect(() => {
        if (isReady) {
            return undefined;
        }

        const handleTransaction = () => {
            if (hasComputedPagination(editor)) {
                setRevision(revision => revision + 1);
                editor.off('transaction', handleTransaction);
            }
        };

        editor.on('transaction', handleTransaction);

        /*
         * Close the render-to-subscribe race if pagination completed between
         * the readiness read above and this effect.
         */
        handleTransaction();

        return () => {
            editor.off('transaction', handleTransaction);
        };
    }, [editor, isReady]);

    return isReady;
};

/** Like `usePaginationReady`, but stays true once the canvas has been presented. */
export const useInitialCanvasReady = (editor: TiptapEditor) => {
    const isPaginationReady = usePaginationReady(editor);
    const [hasPresentedCanvas, setHasPresentedCanvas] = useState(isPaginationReady);

    useLayoutEffect(() => {
        if (isPaginationReady) {
            setHasPresentedCanvas(true);
        }
    }, [isPaginationReady]);

    return hasPresentedCanvas || isPaginationReady;
};
