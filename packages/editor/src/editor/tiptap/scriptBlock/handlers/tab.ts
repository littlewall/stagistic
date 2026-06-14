import type {Editor} from '@tiptap/react';

import {
    SCRIPT_BLOCK_NODE_NAMES,
    getActiveScriptBlockFromState,
} from '../../scriptCore';
import {
    type BlockContext,
    createBlockContext,
} from '../context';
import {type HandlerMap} from './types';

/*
 * Tab and Shift-Tab are reserved for indentation only (block type changes
 * live on Cmd/Ctrl+digit shortcuts and Alt+Enter cycling). Indentation is
 * stored as literal leading tabs; one tab renders 0.5" (tab-size: 5 with
 * the monospace font).
 */
const MAX_ACTION_INDENT = 3;
const MAX_LYRICS_INDENT = 4;

const createIndentTabHandler = (maxIndent: number) => (context: BlockContext, event: KeyboardEvent) => {
    event.preventDefault();

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

const tabHandlers: HandlerMap<(context: BlockContext, event: KeyboardEvent) => boolean> = {
    ["stageDirection"]: createIndentTabHandler(MAX_ACTION_INDENT),
    ["lyrics"]: createIndentTabHandler(MAX_LYRICS_INDENT),
};

export const handleTab = (editor: Editor, event: KeyboardEvent) => {
    const block = getActiveScriptBlockFromState(editor.state, SCRIPT_BLOCK_NODE_NAMES);

    if (!block) {
        return false;
    }

    const context = createBlockContext(editor, block);
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
