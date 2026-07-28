import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    useEffect,
    useState,
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
    const [state, setState] = useState<PaginationState | null>(() => readState(editor));

    useEffect(() => {
        if (!editor) {
            setState(null);

            return;
        }

        const update = () => setState(readState(editor));

        update();
        editor.on('transaction', update);

        return () => {
            editor.off('transaction', update);
        };
    }, [editor]);

    return state;
};
