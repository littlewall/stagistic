import type {Editor} from '@tiptap/react';

import {
    getActiveScriptBlockFromState,
    SCRIPT_BLOCK_NODE_NAMES,
} from '../../scriptCore';
import {
    type BlockContext,
    createBlockContext,
} from '../context';
import {type HandlerMap} from './types';

const pasteHandlers: HandlerMap<(context: BlockContext, event: ClipboardEvent) => boolean> = {
    ['act']: (context, event) => {
        const text = event.clipboardData?.getData('text/plain');

        if (text === undefined) {
            return false;
        }

        event.preventDefault();

        const normalized = text
            .replace(/\s*\n+\s*/g, ' ')
            .toLocaleUpperCase();

        context.editor.commands.insertContent(normalized);

        return true;
    },
    ['aside']: (context, event) => {
        const text = event.clipboardData?.getData('text/plain');

        if (text === undefined) {
            return false;
        }

        event.preventDefault();

        const sanitized = text
            .replace(/\s*\n+\s*/g, ' ')
            .replace(/[()]/g, '');

        context.editor.commands.insertContent(sanitized);

        return true;
    },
};

export const handlePaste = (editor: Editor, event: ClipboardEvent) => {
    const block = getActiveScriptBlockFromState(editor.state, SCRIPT_BLOCK_NODE_NAMES);

    if (!block) {
        return false;
    }

    const handler = pasteHandlers[block.blockType];

    if (!handler) {
        return false;
    }

    return handler(createBlockContext(editor, block), event);
};

export const pasteHandlerMaps = {
    pasteHandlers,
};
