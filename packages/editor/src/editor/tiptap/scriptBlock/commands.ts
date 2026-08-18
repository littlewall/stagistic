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
    isScriptBlockNodeName,
    normalizeBlockNodeType,
} from '../scriptCore';
import {normalizeFormerStageDirectionContent} from './normalizeStageDirectionContent';

const focusEditor = (editor: Editor) => {
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
const restoreBlockSelection = (
    tr: Transaction,
    blockPos: number,
    originalAnchor: number,
    originalHead: number,
): Transaction => {
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

const BLOCK_DELIMITERS: Partial<Record<BlockNodeType, readonly [string, string]>> = {
    aside: ['(', ')'],
    note: ['[[', ']]'],
};

/**
 * Aside and note blocks render their syntax delimiters via CSS. A block
 * converted from a type that allows literal delimiters would otherwise show
 * them twice, so remove one complete outer pair from the editable content.
 */
const stripRenderedBlockDelimiters = (
    tr: Transaction,
    nextBlockType: BlockNodeType,
    blockPos: number,
): Transaction => {
    const delimiters = BLOCK_DELIMITERS[nextBlockType];

    if (!delimiters) {
        return tr;
    }

    const [opening, closing] = delimiters;

    const mappedPos = tr.mapping.map(blockPos);
    const node = tr.doc.nodeAt(mappedPos);

    if (!node) {
        return tr;
    }

    const text = node.textContent;

    if (text.length < opening.length + closing.length
        || !text.startsWith(opening)
        || !text.endsWith(closing)) {
        return tr;
    }

    const contentStart = mappedPos + 1;
    const contentEnd = contentStart + node.content.size;
    let next = tr.delete(contentEnd - closing.length, contentEnd);

    next = next.delete(contentStart, contentStart + opening.length);

    return next;
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
    const {anchor: originalAnchor, head: originalHead} = editor.state.selection;

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
    tr = stripRenderedBlockDelimiters(tr, normalized, activeBlock.pos);
    tr = restoreBlockSelection(tr, activeBlock.pos, originalAnchor, originalHead);
    tr.setMeta(IMMEDIATE_SAVE_META_KEY, true);
    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);

    return true;
};

/**
 * Bulk block-type change for a multi-block selection (the toolbar's
 * "Selected blocks" dropdown). Each block type is its own ProseMirror node
 * type, so the node type itself must be swapped via setNodeMarkup's `type`
 * argument for every matching block — not just the `blockType` attribute —
 * otherwise the node keeps behaving as its old type (persistence, indexing,
 * casing) while only rendering as the new one.
 */
export const updateBlockTypeForSelection = (editor: Editor, blockType: BlockNodeType): boolean => {
    const normalized = normalizeBlockNodeType(blockType);
    const nodes = editor.schema.nodes as Record<string, NodeType>;
    const nodeType = resolveNodeTypeForBlockType(nodes, normalized);

    if (!nodeType) {
        return false;
    }

    const {state} = editor;
    const {from, to} = state.selection;
    let tr = state.tr;
    let didChange = false;

    state.doc.nodesBetween(from, to, (node, pos) => {
        if (!isScriptBlockNodeName(node.type.name)) {
            return true;
        }

        const previousBlockType = normalizeBlockNodeType(
            resolveScriptBlockNodeType(node.type.name) ?? (node.attrs.blockType as BlockNodeType),
        );

        if (previousBlockType === 'act' || previousBlockType === normalized) {
            return false;
        }

        const attributes = {
            ...node.attrs,
            blockType: normalized,
            characterRefs:
                previousBlockType === 'stageDirection' && normalized !== 'stageDirection'
                    ? null
                    : (node.attrs.characterRefs as Record<string, string> | null),
        };

        const mappedPos = tr.mapping.map(pos);

        tr = tr.setNodeMarkup(mappedPos, nodeType, attributes);
        tr = stripLeadingActionTabs(tr, previousBlockType, normalized, mappedPos + 1, node.textContent ?? '');
        tr = normalizeFormerStageDirectionContent(tr, editor.schema, previousBlockType, normalized, pos, node);
        tr = normalizeCharacterMusicText(tr, normalized, pos);
        tr = stripRenderedBlockDelimiters(tr, normalized, pos);
        didChange = true;

        return false;
    });

    if (!didChange) {
        return false;
    }

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

/**
 * Splitting at the very start of a block isn't really a split - nothing moves
 * to the new block - it's "push an empty block in above me". Doing it via
 * ProseMirror's splitBlock actively hurts here on two counts: it rewrites the
 * leading (empty) half to the schema's default block type, which is whatever
 * node happens to be registered first (scene) rather than anything the writer
 * asked for; and because a split copies the original attrs to both halves, the
 * caret half is the one that ends up needing a fresh id, leaving the empty
 * block holding the original block's identity. Insert the block directly
 * instead and leave the caret (and the original id) on the text.
 */
const insertEmptyBlockBefore = (
    editor: Editor,
    block: ActiveScriptBlock,
    blockType: BlockNodeType,
): boolean => {
    const nodes = editor.schema.nodes as Record<string, NodeType>;
    const nodeType = resolveNodeTypeForBlockType(nodes, blockType);

    if (!nodeType) {
        return false;
    }

    const insertedNode = nodeType.create({blockType, id: createNodeId()});
    const {anchor, head} = editor.state.selection;
    let tr = editor.state.tr.insert(block.pos, insertedNode);

    tr = tr.setSelection(TextSelection.create(
        tr.doc,
        tr.mapping.map(anchor),
        tr.mapping.map(head),
    ));
    tr.setMeta(IMMEDIATE_SAVE_META_KEY, true);
    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);

    return true;
};

/*
 * Mirrors prosemirror-commands' own `!atEnd && atStart` test: the caret sits
 * at the block start with content still ahead of it. An empty block is both
 * at start and at end, and must keep taking the normal split path.
 */
const isAtBlockStartWithContentAhead = (editor: Editor, block: ActiveScriptBlock) => {
    const {selection} = editor.state;

    return selection.empty && selection.from === block.from && selection.from !== block.to;
};

export const splitBlockWithType = (editor: Editor, blockType: BlockNodeType) => {
    const activeBlock = getActiveScriptBlockFromState(editor.state);

    if (activeBlock && blockNodeHasMusicAtom(activeBlock.node)) {
        return insertEmptyBlockAfterMusicBlock(editor, blockType);
    }

    if (activeBlock && isAtBlockStartWithContentAhead(editor, activeBlock)) {
        return insertEmptyBlockBefore(editor, activeBlock, blockType);
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

    const {anchor: originalAnchor, head: originalHead} = editor.state.selection;

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
    tr = stripRenderedBlockDelimiters(tr, normalized, block.pos);
    tr = restoreBlockSelection(tr, block.pos, originalAnchor, originalHead);
    tr.setMeta(IMMEDIATE_SAVE_META_KEY, true);

    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);

    return true;
};
