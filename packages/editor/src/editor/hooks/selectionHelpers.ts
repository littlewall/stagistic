import {TextSelection} from '@tiptap/pm/state';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {
    findScriptBlockSelectionPosFromState,
    getActiveScriptBlockFromState,
    SCRIPT_BLOCK_NODE_NAMES,
} from '../tiptap/scriptCore';

export const restoreSelectionForBlock = (editor: TiptapEditor, blockId: string | null) => {
    if (!blockId) {
        return;
    }

    const selectionPos = findScriptBlockSelectionPosFromState(editor.state, blockId);

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
    const activeBlock = getActiveScriptBlockFromState(editor.state, SCRIPT_BLOCK_NODE_NAMES);
    const preservedBlockId = activeBlock?.id ?? null;

    callback();
    restoreSelectionForBlock(editor, preservedBlockId);
};
