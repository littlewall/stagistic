import {
    createNodeId,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    normalizeCharacterEditorDelimiters,
    resolveScriptBlockNodeType,
} from '@stagistic/script';
import type {Node as ProseMirrorNode, NodeType} from '@tiptap/pm/model';
import {TextSelection, type Transaction} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {IMMEDIATE_SAVE_META_KEY} from '../../saveMeta';
import {
    type ActiveScriptBlock,
    type BlockNodeType,
    getActiveScriptBlockFromState,
    normalizeBlockNodeType,
} from '../scriptCore';
import {normalizeFormerStageDirectionContent} from './normalizeStageDirectionContent';

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
    previousBlockType: BlockNodeType,
    nextBlockType: BlockNodeType,
    blockContentStart: number,
    blockText: string,
): Transaction => {
    if (previousBlockType !== 'stageDirection' || nextBlockType === 'stageDirection') {
        return tr;
    }

    const indentCount = countLeadingTabs(blockText);

    if (indentCount === 0) {
        return tr;
    }

    return tr.delete(blockContentStart, blockContentStart + indentCount);
};

const normalizeCharacterMusicText = (
    tr: Transaction,
    nextBlockType: BlockNodeType,
    blockPos: number,
): Transaction => {
    if (nextBlockType !== 'character') {
        return tr;
    }

    const mappedPos = tr.mapping.map(blockPos);
    const node = tr.doc.nodeAt(mappedPos);

    if (!node) {
        return tr;
    }

    const contentStart = mappedPos + 1;
    const contentEnd = contentStart + node.content.size;
    const text = node.textContent;
    const normalized = normalizeCharacterEditorDelimiters(text);

    if (normalized === text) {
        return tr;
    }

    return tr.insertText(normalized, contentStart, contentEnd);
};

const resolveNodeTypeForBlockType = (nodes: Record<string, NodeType>, blockType: BlockNodeType) => {
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

export const updateBlockType = (editor: Editor, blockType: BlockNodeType, id?: string) => {
    const normalized = normalizeBlockNodeType(blockType);
    const activeBlock = getActiveScriptBlockFromState(editor.state);

    if (!activeBlock) {
        return false;
    }

    const nodes = editor.schema.nodes as Record<string, NodeType>;
    const nodeType = resolveNodeTypeForBlockType(nodes, normalized);

    if (!nodeType) {
        return false;
    }

    const attributes = {
        ...activeBlock.node.attrs,
        blockType: normalized,
        id: id ?? activeBlock.id,
        characterRefs:
            activeBlock.blockType === 'stageDirection' && normalized !== 'stageDirection'
                ? null
                : (activeBlock.node.attrs.characterRefs as Record<string, string> | null),
    };

    let tr = editor.state.tr.setNodeMarkup(activeBlock.pos, nodeType, attributes);

    tr = stripLeadingActionTabs(
        tr,
        activeBlock.blockType,
        normalized,
        activeBlock.from,
        activeBlock.node.textContent ?? '',
    );
    tr = normalizeFormerStageDirectionContent(
        tr,
        editor.schema,
        activeBlock.blockType,
        normalized,
        activeBlock.pos,
        activeBlock.node,
    );
    tr = normalizeCharacterMusicText(tr, normalized, activeBlock.pos);
    tr = setSelectionNearBlockStart(tr, activeBlock.pos);
    tr.setMeta(IMMEDIATE_SAVE_META_KEY, true);
    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);

    return true;
};

const isMusicAtomNodeName = (name: string | undefined): boolean => {
    return name === MUSIC_START_NODE_NAME || name === MUSIC_OUT_NODE_NAME;
};

const blockNodeHasMusicAtom = (node: ProseMirrorNode): boolean => {
    let found = false;

    node.forEach(child => {
        if (isMusicAtomNodeName(child.type.name)) {
            found = true;
        }
    });

    return found;
};

/**
 * A music atom is bound to its block and always sits at the block end (§4.1).
 * A block split moves everything after the caret into the new block, so a
 * music would migrate with it (or, when splitting an otherwise-empty block, be
 * stranded in the wrong sibling). Rather than split a music-bearing block, keep
 * it (with its music and any text) intact and insert an empty typed block right
 * after it, moving the caret there.
 */
const insertEmptyBlockAfterMusicBlock = (editor: Editor, blockType: BlockNodeType): boolean => {
    const nodes = editor.schema.nodes as Record<string, NodeType>;
    const nextNodeType = resolveNodeTypeForBlockType(nodes, blockType);

    if (!nextNodeType) {
        return false;
    }

    const block = getActiveScriptBlockFromState(editor.state);

    if (!block) {
        return false;
    }

    const insertPos = block.pos + block.node.nodeSize;
    const insertedNode = nextNodeType.create({blockType, id: createNodeId()});
    let tr = editor.state.tr.insert(insertPos, insertedNode);
    // The inserted block opens at insertPos; its content starts one past that.
    const selectionPos = insertPos + 1;

    tr = tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos), 1));
    tr.setMeta(IMMEDIATE_SAVE_META_KEY, true);
    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);

    return true;
};

export const splitBlockWithType = (editor: Editor, blockType: BlockNodeType) => {
    const activeBlock = getActiveScriptBlockFromState(editor.state);

    if (activeBlock && blockNodeHasMusicAtom(activeBlock.node)) {
        return insertEmptyBlockAfterMusicBlock(editor, blockType);
    }

    const didSplit = editor.commands.splitBlock();

    if (!didSplit) {
        return false;
    }

    return updateBlockType(editor, blockType, createNodeId());
};

export const insertActionBefore = (editor: Editor, blockPos: number, blockStart: number) => {
    const nodes = editor.schema.nodes as Record<string, NodeType>;
    const actionNodeType = resolveNodeTypeForBlockType(nodes, 'stageDirection');

    if (!actionNodeType) {
        return false;
    }

    const actionBlock = actionNodeType.create({
        blockType: 'stageDirection',
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
    block: ActiveScriptBlock,
    blockType: BlockNodeType,
) => {
    const normalized = normalizeBlockNodeType(blockType);
    const nodes = editor.schema.nodes as Record<string, NodeType>;
    const nodeType = resolveNodeTypeForBlockType(nodes, normalized);

    if (!nodeType) {
        return false;
    }

    const attrs = {
        ...block.node.attrs,
        blockType: normalized,
        id: block.id,
        characterRefs:
            block.blockType === 'stageDirection' && normalized !== 'stageDirection'
                ? null
                : (block.node.attrs.characterRefs as Record<string, string> | null),
    };

    let tr = editor.state.tr.setNodeMarkup(block.pos, nodeType, attrs);

    tr = stripLeadingActionTabs(
        tr,
        block.blockType,
        normalized,
        block.from,
        block.node.textContent ?? '',
    );
    tr = normalizeFormerStageDirectionContent(
        tr,
        editor.schema,
        block.blockType,
        normalized,
        block.pos,
        block.node,
    );
    tr = setSelectionNearBlockStart(tr, block.pos);
    tr.setMeta(IMMEDIATE_SAVE_META_KEY, true);

    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);

    return true;
};
