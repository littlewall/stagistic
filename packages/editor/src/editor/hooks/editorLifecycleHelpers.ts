import {type Selection, TextSelection} from '@tiptap/pm/state';
import {type Editor as TiptapEditor} from '@tiptap/react';

export const getWindowTarget = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window;
};

export const forcePaginationRecalc = (editor: TiptapEditor) => {
    type PaginationCommands = {forcePaginationRecalc?: () => boolean};
    (editor.commands as PaginationCommands).forcePaginationRecalc?.();
};

export const resolveInitialSelection = (editor: TiptapEditor): Selection => {
    let firstScenePosition: number | null = null;

    editor.state.doc.descendants((node, pos) => {
        if (firstScenePosition !== null) {
            return false;
        }

        if (node.type.name !== 'scene') {
            return true;
        }

        firstScenePosition = pos + 1;

        return false;
    });

    if (firstScenePosition === null) {
        return TextSelection.atStart(editor.state.doc);
    }

    return TextSelection.near(editor.state.doc.resolve(firstScenePosition), 1);
};

/*
 * Tracks which initial content each editor instance already applied. A cached
 * surface re-attached on a later mount must NOT re-apply the load-time initial
 * value — it would wipe newer live content and re-pay setContent + pagination.
 */
