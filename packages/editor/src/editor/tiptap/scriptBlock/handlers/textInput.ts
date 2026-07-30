import {
    normalizeCharacterEditorDelimiters,
} from '@stagistic/script';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {
    getActiveScriptBlockFromState,
    SCRIPT_BLOCK_NODE_NAMES,
} from '../../scriptCore';
import {
    insertParenPair,
} from '../commands';
import {
    type BlockContext,
    createBlockContext,
    getSelectionOffset,
    isInsideParentheses,
} from '../context';
import {
    type BlockCasingMap,
    type HandlerMap,
} from './types';

const keyDownHandlers: HandlerMap<(context: BlockContext, event: KeyboardEvent) => boolean> = {
    ['aside']: (_context, event) => {
        if (event.key === '(' || event.key === ')') {
            event.preventDefault();

            return true;
        }

        return false;
    },
    ['character']: (context, event) => {
        if (event.key !== '(') {
            return false;
        }

        event.preventDefault();
        insertParenPair(context.editor, context.editor.state.selection.from, context.editor.state.selection.to);

        return true;
    },
};

const handleCharacterInput = (
    context: BlockContext,
    from: number,
    to: number,
    text: string,
    enforceUppercase: boolean,
) => {
    if (text === '(') {
        insertParenPair(context.editor, from, to);

        return true;
    }

    const offset = getSelectionOffset(context.editor, context.block.from);
    const blockText = context.block.node.textContent ?? '';
    const insideParens = isInsideParentheses(blockText, offset);

    // '/' is the canonical delimiter; a typed '+' is normalized to '/' too.
    if (text === '/' || text === '+') {
        const replaceFrom = Math.max(0, Math.min(from - context.block.from, blockText.length));
        const replaceTo = Math.max(replaceFrom, Math.min(to - context.block.from, blockText.length));
        const nextText = `${blockText.slice(0, replaceFrom)}${text}${blockText.slice(replaceTo)}`;
        const nextPrefix = `${blockText.slice(0, replaceFrom)}${text}`;
        const normalized = normalizeCharacterEditorDelimiters(nextText);
        const selectionOffset = normalizeCharacterEditorDelimiters(nextPrefix).length;
        let tr = context.editor.state.tr.insertText(normalized, context.block.from, context.block.to);

        tr = tr.setSelection(TextSelection.create(tr.doc, context.block.from + selectionOffset));
        context.editor.view.dispatch(tr);

        return true;
    }

    if (text === ' ' && !insideParens) {
        const previous = offset > 0 ? blockText[offset - 1] : '';
        const next = blockText[offset] ?? '';

        if (previous === '/' || next === '/' || previous === '+' || next === '+') {
            return true;
        }
    }

    if (enforceUppercase && !insideParens) {
        const upper = text.toUpperCase();

        if (upper !== text) {
            const tr = context.editor.state.tr.insertText(upper, from, to);

            context.editor.view.dispatch(tr);

            return true;
        }
    }

    return false;
};

const handleParentheticalInput = (
    context: BlockContext,
    from: number,
    to: number,
    text: string,
) => {
    if (!(/[()]/).test(text)) {
        return false;
    }

    const sanitized = text.replace(/[()]/g, '');

    if (sanitized.length === 0) {
        return true;
    }

    const tr = context.editor.state.tr.insertText(sanitized, from, to);

    context.editor.view.dispatch(tr);

    return true;
};

const textInputHandlers: HandlerMap<(
    context: BlockContext,
    from: number,
    to: number,
    text: string,
) => boolean> = {
    ['aside']: handleParentheticalInput,
};

export const handleTextInput = (
    editor: Editor,
    from: number,
    to: number,
    text: string,
    blockCasing?: BlockCasingMap,
) => {
    const block = getActiveScriptBlockFromState(editor.state, SCRIPT_BLOCK_NODE_NAMES);

    if (!block) {
        return false;
    }

    if (block.blockType === 'character') {
        const casing = blockCasing?.[block.blockType] ?? 'uppercase';
        const enforceUppercase = casing === 'uppercase';

        return handleCharacterInput(createBlockContext(editor, block), from, to, text, enforceUppercase);
    }

    if (block.blockType === 'act') {
        const upper = text.toLocaleUpperCase();

        if (upper !== text) {
            const tr = editor.state.tr.insertText(upper, from, to);

            editor.view.dispatch(tr);

            return true;
        }
    }

    const handler = textInputHandlers[block.blockType];

    if (!handler) {
        return false;
    }

    return handler(createBlockContext(editor, block), from, to, text);
};

export const textInputHandlerMaps = {
    keyDownHandlers,
    textInputHandlers,
};
