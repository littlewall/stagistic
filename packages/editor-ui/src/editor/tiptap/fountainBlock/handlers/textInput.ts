import {
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_PARENTHETICAL,
    normalizeCharacterEditorDelimiters,
} from '@stagistic/script-core';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
} from '../../fountainCore';
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
    [ELEMENT_PARENTHETICAL]: (_context, event) => {
        if (event.key === '(' || event.key === ')') {
            event.preventDefault();

            return true;
        }

        return false;
    },
    [ELEMENT_CHARACTER]: (context, event) => {
        if (event.key !== '(') {
            return false;
        }

        event.preventDefault();
        insertParenPair(context.editor, context.editor.state.selection.from, context.editor.state.selection.to);

        return true;
    },
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: (context, event) => {
        if (event.key !== '(') {
            return false;
        }

        event.preventDefault();
        insertParenPair(context.editor, context.editor.state.selection.from, context.editor.state.selection.to);

        return true;
    },
};

const normalizeActiveCharacterDelimiters = (editor: Editor) => {
    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (
        !block
        || (block.blockType !== ELEMENT_CHARACTER
            && block.blockType !== ELEMENT_DUAL_DIALOGUE_CHARACTER)
    ) {
        return;
    }

    const text = block.node.textContent ?? '';
    const normalized = normalizeCharacterEditorDelimiters(text);

    if (normalized === text) {
        return;
    }

    const selectionOffset = Math.max(0, Math.min(editor.state.selection.from - block.from, normalized.length));
    let tr = editor.state.tr.insertText(normalized, block.from, block.to);

    tr = tr.setSelection(TextSelection.create(tr.doc, block.from + selectionOffset));
    editor.view.dispatch(tr);
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

    if (text === '+') {
        const tr = context.editor.state.tr.insertText('+', from, to);

        context.editor.view.dispatch(tr);
        normalizeActiveCharacterDelimiters(context.editor);

        return true;
    }

    if (text === ' ' && !insideParens) {
        const previous = offset > 0 ? blockText[offset - 1] : '';
        const next = blockText[offset] ?? '';

        if (previous === '+' || next === '+') {
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
    [ELEMENT_PARENTHETICAL]: handleParentheticalInput,
};

export const handleTextInput = (
    editor: Editor,
    from: number,
    to: number,
    text: string,
    blockCasing?: BlockCasingMap,
) => {
    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (!block) {
        return false;
    }

    if (
        block.blockType === ELEMENT_CHARACTER
        || block.blockType === ELEMENT_DUAL_DIALOGUE_CHARACTER
    ) {
        const casing = blockCasing?.[block.blockType] ?? 'uppercase';
        const enforceUppercase = casing === 'uppercase';

        return handleCharacterInput(createBlockContext(editor, block), from, to, text, enforceUppercase);
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
