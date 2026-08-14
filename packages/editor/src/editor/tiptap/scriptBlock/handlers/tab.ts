import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import type {Editor} from '@tiptap/react';

import {getBlockQuickToggleTarget} from '../../../model/blockQuickToggle';
import {
    type BlockNodeType,
    getActiveScriptBlockFromState,
    SCRIPT_BLOCK_NODE_NAMES,
} from '../../scriptCore';
import {setBlockTypeWithSelection} from '../commands';
import {
    type BlockContext,
    createBlockContext,
} from '../context';
import {type HandlerMap} from './types';

/*
 * Stage directions use literal leading tabs for indentation; one tab renders
 * 0.5" (tab-size: 5 with the monospace font).
 */
const MAX_ACTION_INDENT = 2;

const hasAnyTabModifier = (event: KeyboardEvent) => event.altKey || event.ctrlKey || event.metaKey;

const isQuickToggleShortcut = (event: KeyboardEvent) => {
    return event.altKey && !event.shiftKey && !event.metaKey;
};

const isPlainTab = (event: KeyboardEvent) => !hasAnyTabModifier(event) && !event.shiftKey;

const createIndentTabHandler = (maxIndent: number) => (context: BlockContext, event: KeyboardEvent) => {
    event.preventDefault();

    if (hasAnyTabModifier(event)) {
        return true;
    }

    const text = context.block.node.textContent ?? '';
    let indentCount = 0;

    while (text.startsWith('\t', indentCount)) {
        indentCount += 1;
    }

    if (event.shiftKey) {
        if (indentCount === 0) {
            return true;
        }

        const tr = context.editor.state.tr.delete(context.block.from, context.block.from + 1);

        context.editor.view.dispatch(tr);

        return true;
    }

    if (indentCount >= maxIndent) {
        return true;
    }

    const tr = context.editor.state.tr.insertText('\t', context.block.from);

    context.editor.view.dispatch(tr);

    return true;
};

/*
 * An aside doesn't record whether it interrupted a dialogue or a lyrics flow,
 * so toggling it back has to infer that from context: walk back through
 * preceding siblings (script blocks are flat children of doc), skipping over
 * any run of further asides, and use the type of the first non-aside block
 * found. Lyrics resumes lyrics; anything else (dialogue, another block type,
 * or no preceding block at all) falls back to dialogue.
 */
const findPrecedingFlowBlockType = (doc: ProseMirrorNode, blockPos: number): BlockNodeType | null => {
    let searchPos = blockPos;

    while (searchPos > 0) {
        const {node, offset} = doc.childBefore(searchPos);

        if (!node) {
            return null;
        }

        if (node.type.name !== 'aside') {
            return node.attrs.blockType as BlockNodeType;
        }

        searchPos = offset;
    }

    return null;
};

/**
 * The flow an aside interrupted, and therefore the type both Tab (toggling the
 * aside back) and Enter (continuing past it) should resume. One resolver for
 * one question, so the two keys can't disagree about the same block.
 */
export const resolveAsideFlowTarget = (
    doc: ProseMirrorNode,
    blockPos: number,
): BlockNodeType => {
    const flowOrigin = findPrecedingFlowBlockType(doc, blockPos);

    return flowOrigin === 'lyrics' ? 'lyrics' : 'dialogue';
};

/**
 * The block a plain Tab would switch this one to, or null when Tab does
 * something else here (stage direction indents; everything else is inert).
 * Exported so the status bar can advertise the same destination Tab will
 * actually produce.
 */
export const resolveAsideToggleTarget = (
    doc: ProseMirrorNode,
    blockType: BlockNodeType,
    blockPos: number,
): BlockNodeType | null => {
    if (blockType === 'dialogue' || blockType === 'lyrics') {
        return 'aside';
    }

    if (blockType === 'aside') {
        return resolveAsideFlowTarget(doc, blockPos);
    }

    return null;
};

const toggleAsideTarget = (context: BlockContext): BlockNodeType | null => resolveAsideToggleTarget(
    context.editor.state.doc,
    context.block.blockType,
    context.block.pos,
);

const handleQuickToggle = (context: BlockContext, event: KeyboardEvent) => {
    const nextBlockType = getBlockQuickToggleTarget(context.block.blockType);

    if (!nextBlockType) {
        return false;
    }

    event.preventDefault();

    return setBlockTypeWithSelection(context.editor, context.block, nextBlockType);
};

const handleAsideToggle = (context: BlockContext, event: KeyboardEvent) => {
    const nextBlockType = toggleAsideTarget(context);

    if (!nextBlockType) {
        return false;
    }

    event.preventDefault();

    return setBlockTypeWithSelection(context.editor, context.block, nextBlockType);
};

const tabHandlers: HandlerMap<(context: BlockContext, event: KeyboardEvent) => boolean> = {
    ['stageDirection']: createIndentTabHandler(MAX_ACTION_INDENT),
};

export const handleTab = (editor: Editor, event: KeyboardEvent) => {
    const block = getActiveScriptBlockFromState(editor.state, SCRIPT_BLOCK_NODE_NAMES);

    if (!block) {
        return false;
    }

    const context = createBlockContext(editor, block);

    if (isQuickToggleShortcut(event) && handleQuickToggle(context, event)) {
        return true;
    }

    if (isPlainTab(event) && handleAsideToggle(context, event)) {
        return true;
    }

    const handler = tabHandlers[block.blockType];

    if (handler) {
        return handler(context, event);
    }

    event.preventDefault();

    return true;
};

export const tabHandlerMaps = {
    tabHandlers,
};
