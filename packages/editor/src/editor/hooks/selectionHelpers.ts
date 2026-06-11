import {TextSelection} from '@tiptap/pm/state';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {
    findFountainBlockSelectionPosFromState,
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
} from '../tiptap/fountainCore';

export const restoreSelectionForBlock = (editor: TiptapEditor, blockId: string | null) => {
    if (!blockId) {
        return;
    }

    const selectionPos = findFountainBlockSelectionPosFromState(editor.state, blockId);

    if (selectionPos === null) {
        return;
    }

    const tr = editor.state.tr
        .setSelection(TextSelection.near(editor.state.doc.resolve(selectionPos), 1))
        .setMeta('preventUpdate', true)
        .scrollIntoView();

    editor.view.dispatch(tr);
};

export const withActiveBlockPreserved = (editor: TiptapEditor, callback: () => void) => {
    const activeBlock = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);
    const preservedBlockId = activeBlock?.id ?? null;

    callback();
    restoreSelectionForBlock(editor, preservedBlockId);
};
