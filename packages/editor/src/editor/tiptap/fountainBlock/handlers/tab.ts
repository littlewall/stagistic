import {
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
} from '@stagistic/script';
import type {Editor} from '@tiptap/react';

import {
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
} from '../../fountainCore';
import {
    updateBlockType,
} from '../commands';
import {
    type BlockContext,
    createBlockContext,
} from '../context';
import {resolveParentheticalTabTarget} from './enter';
import {type HandlerMap} from './types';

const MAX_ACTION_INDENT = 3;

const handleActionTab = (context: BlockContext, event: KeyboardEvent) => {
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

    if (indentCount >= MAX_ACTION_INDENT) {
        return true;
    }

    const tr = context.editor.state.tr.insertText('\t', context.block.from);

    context.editor.view.dispatch(tr);

    return true;
};

const tabHandlers: HandlerMap<(context: BlockContext, event: KeyboardEvent) => boolean> = {
    [ELEMENT_CHARACTER]: (context, event) => {
        event.preventDefault();

        return updateBlockType(context.editor, ELEMENT_ACTION);
    },
    [ELEMENT_DIALOGUE]: (context, event) => {
        event.preventDefault();

        return updateBlockType(context.editor, ELEMENT_PARENTHETICAL);
    },
    [ELEMENT_LYRICS]: (context, event) => {
        event.preventDefault();

        return updateBlockType(context.editor, ELEMENT_PARENTHETICAL);
    },
    [ELEMENT_PARENTHETICAL]: (context, event) => {
        event.preventDefault();

        return updateBlockType(
            context.editor,
            resolveParentheticalTabTarget(context.editor, context.block.pos),
        );
    },
    [ELEMENT_ACTION]: handleActionTab,
};

export const handleTab = (editor: Editor, event: KeyboardEvent) => {
    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

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
