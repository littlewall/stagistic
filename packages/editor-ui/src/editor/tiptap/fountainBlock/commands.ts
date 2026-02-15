import {
    createNodeId,
    ELEMENT_ACTION,
} from '@stagistic/script-core';
import type {NodeType} from '@tiptap/pm/model';
import {TextSelection, type Transaction} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {
    type ActiveFountainBlock,
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainBlockType,
    normalizeFountainBlockType,
} from '../fountainCore';

const focusEditor = (editor: Editor) => {
    editor.view.focus();
    editor.commands.focus();
};

const setSelectionNearBlockStart = (tr: Transaction, blockPos: number) => {
    const mappedPos = tr.mapping.map(blockPos + 1);
    const resolved = tr.doc.resolve(mappedPos);

    return tr.setSelection(TextSelection.near(resolved, 1));
};

export const insertParenPair = (editor: Editor, from: number, to: number) => {
    let tr = editor.state.tr.insertText('()', from, to);
    const nextSelection = from + 1;

    tr = tr.setSelection(TextSelection.create(tr.doc, nextSelection));
    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);
};

export const updateBlockType = (editor: Editor, blockType: FountainBlockType, id?: string) => {
    const normalized = normalizeFountainBlockType(blockType);
    const attributes: Record<string, unknown> = {
        blockType: normalized,
    };

    if (id) {
        attributes.id = id;
    }

    return editor.commands.updateAttributes(FOUNTAIN_BLOCK_NODE_NAME, attributes);
};

export const splitBlockWithType = (editor: Editor, blockType: FountainBlockType) => {
    const didSplit = editor.commands.splitBlock();

    if (!didSplit) {
        return false;
    }

    return updateBlockType(editor, blockType, createNodeId());
};

export const insertActionBefore = (editor: Editor, blockPos: number, blockStart: number) => {
    const nodes = editor.schema.nodes as Record<string, NodeType>;
    const blockType = nodes[FOUNTAIN_BLOCK_NODE_NAME];

    if (!blockType) {
        return false;
    }

    const actionBlock = blockType.create({
        blockType: ELEMENT_ACTION,
        id: createNodeId(),
    });

    let tr = editor.state.tr.insert(blockPos, actionBlock);
    const mappedStart = tr.mapping.map(blockStart);

    tr = tr.setSelection(TextSelection.create(tr.doc, mappedStart));
    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);

    return true;
};

export const setBlockTypeWithSelection = (
    editor: Editor,
    block: ActiveFountainBlock,
    blockType: FountainBlockType,
) => {
    const normalized = normalizeFountainBlockType(blockType);
    const attrs = {
        ...block.node.attrs,
        blockType: normalized,
        id: block.id,
    };

    let tr = editor.state.tr.setNodeMarkup(block.pos, undefined, attrs);

    tr = setSelectionNearBlockStart(tr, block.pos);

    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);

    return true;
};
