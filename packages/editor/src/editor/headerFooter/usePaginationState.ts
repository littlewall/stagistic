import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    useCallback,
    useSyncExternalStore,
} from 'react';

import {paginationKey} from '../tiptap/extensions/pagination/plugin/createPaginationPlugin';
import type {PaginationState} from '../tiptap/extensions/pagination/types';

const readState = (editor: TiptapEditor | null): PaginationState | null => {
    if (!editor) {
        return null;
    }

    return paginationKey.getState(editor.state)?.pagination ?? null;
};

export const usePaginationState = (editor: TiptapEditor | null): PaginationState | null => {
    const subscribe = useCallback((notify: () => void) => {
        if (!editor) {
            return () => {};
        }

        editor.on('transaction', notify);

        return () => {
            editor.off('transaction', notify);
        };
    }, [editor]);
    const getSnapshot = useCallback(() => readState(editor), [editor]);

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};
