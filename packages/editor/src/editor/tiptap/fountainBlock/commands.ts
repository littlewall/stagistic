import {
    createNodeId,
    ELEMENT_ACTION,
    resolveScriptBlockNodeType,
} from '@stagistic/script';
import type {NodeType} from '@tiptap/pm/model';
import {TextSelection, type Transaction} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {IMMEDIATE_SAVE_META_KEY} from '../../saveMeta';
import {
    type ActiveFountainBlock,
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainBlockType,
    getActiveFountainBlockFromState,
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

const countLeadingTabs = (text: string) => {
    let count = 0;

    while (text.startsWith('\t', count)) {
        count += 1;
    }

    return count;
};

const stripLeadingActionTabs = (
    tr: Transaction,
    previousBlockType: FountainBlockType,
    nextBlockType: FountainBlockType,
    blockContentStart: number,
    blockText: string,
): Transaction => {
    if (previousBlockType !== ELEMENT_ACTION || nextBlockType === ELEMENT_ACTION) {
        return tr;
    }

    const indentCount = countLeadingTabs(blockText);

    if (indentCount === 0) {
        return tr;
    }

    return tr.delete(blockContentStart, blockContentStart + indentCount);
};

const resolveNodeTypeForBlockType = (
    nodes: Record<string, NodeType>,
    currentNodeTypeName: string,
    blockType: FountainBlockType,
) => {
    if (currentNodeTypeName === FOUNTAIN_BLOCK_NODE_NAME) {
        return nodes[FOUNTAIN_BLOCK_NODE_NAME] ?? null;
    }

    const resolvedNodeTypeName = resolveScriptBlockNodeType(blockType);

    if (!resolvedNodeTypeName) {
        return null;
    }

    return nodes[resolvedNodeTypeName] ?? null;
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
    const activeBlock = getActiveFountainBlockFromState(editor.state);

    if (!activeBlock) {
        return false;
    }

    const nodes = editor.schema.nodes as Record<string, NodeType>;
    const nodeType = resolveNodeTypeForBlockType(nodes, activeBlock.node.type.name, normalized);

    if (!nodeType) {
        return false;
    }

    const attributes = {
        ...activeBlock.node.attrs,
        blockType: normalized,
        id: id ?? activeBlock.id,
    };

    let tr = editor.state.tr.setNodeMarkup(activeBlock.pos, nodeType, attributes);

    tr = stripLeadingActionTabs(
        tr,
        activeBlock.blockType,
        normalized,
        activeBlock.from,
        activeBlock.node.textContent ?? '',
    );
    tr = setSelectionNearBlockStart(tr, activeBlock.pos);
    tr.setMeta(IMMEDIATE_SAVE_META_KEY, true);
    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);

    return true;
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
    const currentBlock = editor.state.doc.nodeAt(blockPos);
    const currentNodeTypeName = currentBlock?.type.name ?? FOUNTAIN_BLOCK_NODE_NAME;
    const actionNodeType = resolveNodeTypeForBlockType(nodes, currentNodeTypeName, ELEMENT_ACTION);

    if (!actionNodeType) {
        return false;
    }

    const actionBlock = actionNodeType.create({
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
    const nodes = editor.schema.nodes as Record<string, NodeType>;
    const nodeType = resolveNodeTypeForBlockType(nodes, block.node.type.name, normalized);

    if (!nodeType) {
        return false;
    }

    const attrs = {
        ...block.node.attrs,
        blockType: normalized,
        id: block.id,
    };

    let tr = editor.state.tr.setNodeMarkup(block.pos, nodeType, attrs);

    tr = stripLeadingActionTabs(
        tr,
        block.blockType,
        normalized,
        block.from,
        block.node.textContent ?? '',
    );
    tr = setSelectionNearBlockStart(tr, block.pos);
    tr.setMeta(IMMEDIATE_SAVE_META_KEY, true);

    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);

    return true;
};
