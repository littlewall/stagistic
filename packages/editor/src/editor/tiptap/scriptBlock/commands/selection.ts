import {TextSelection, type Transaction} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

export const focusEditor = (editor: Editor) => {
    editor.view.focus();
    editor.commands.focus();
};

const clampToRange = (pos: number, min: number, max: number) => Math.min(Math.max(pos, min), max);

/**
 * A single-block type change (keyboard shortcut, Tab toggle, ...) shouldn't
 * knock the cursor back to the block start — restore it (or the selected
 * range) at the same offset, mapped through whatever content-normalizing
 * edits ran earlier in the transaction and clamped to the block's new
 * content, in case that content got shorter (stripped tabs/parens, etc).
 */
export const restoreBlockSelection = (tr: Transaction, blockPos: number, originalAnchor: number, originalHead: number): Transaction => {
    const mappedPos = tr.mapping.map(blockPos);
    const node = tr.doc.nodeAt(mappedPos);

    if (!node) {
        return tr;
    }

    const contentStart = mappedPos + 1;
    const contentEnd = contentStart + node.content.size;
    const anchor = clampToRange(tr.mapping.map(originalAnchor), contentStart, contentEnd);
    const head = clampToRange(tr.mapping.map(originalHead), contentStart, contentEnd);

    return tr.setSelection(TextSelection.create(tr.doc, anchor, head));
};
