import type {Editor} from '@tiptap/react';

import {getBlockQuickToggleTarget} from '../../../model/blockQuickToggle';
import {
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
 * Stage directions and lyrics use literal leading tabs for indentation; one
 * tab renders 0.5" (tab-size: 5 with the monospace font).
 */
const MAX_ACTION_INDENT = 2;
const MAX_LYRICS_INDENT = 3;

const hasAnyTabModifier = (event: KeyboardEvent) => event.altKey || event.ctrlKey || event.metaKey;

const isQuickToggleShortcut = (event: KeyboardEvent) => {
    return event.altKey && !event.shiftKey && !event.metaKey;
};

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

const toggleAsideTarget = (blockType: BlockContext['block']['blockType']) => {
    if (blockType === 'dialogue') {
        return 'aside';
    }

    if (blockType === 'aside') {
        return 'dialogue';
    }

    return null;
};

const handleQuickToggle = (context: BlockContext, event: KeyboardEvent) => {
    const nextBlockType = getBlockQuickToggleTarget(context.block.blockType);

    if (!nextBlockType) {
        return false;
    }

    event.preventDefault();

    return setBlockTypeWithSelection(context.editor, context.block, nextBlockType);
};

const handleAsideToggle = (context: BlockContext, event: KeyboardEvent) => {
    const nextBlockType = toggleAsideTarget(context.block.blockType);

    if (!nextBlockType) {
        return false;
    }

    event.preventDefault();

    return setBlockTypeWithSelection(context.editor, context.block, nextBlockType);
};

const tabHandlers: HandlerMap<(context: BlockContext, event: KeyboardEvent) => boolean> = {
    ['stageDirection']: createIndentTabHandler(MAX_ACTION_INDENT),
    ['lyrics']: createIndentTabHandler(MAX_LYRICS_INDENT),
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

    if (!hasAnyTabModifier(event) && handleAsideToggle(context, event)) {
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
