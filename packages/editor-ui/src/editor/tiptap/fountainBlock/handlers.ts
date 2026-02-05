import {
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_PARENTHETICAL,
} from '@stagistic/editor-core';
import type {Editor} from '@tiptap/react';

import {
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainBlockType,
    getActiveFountainBlockFromState,
    getNextTypeOnEnter,
} from '../fountainCore';
import {
    insertActionBefore,
    insertParenPair,
    setBlockTypeWithSelection,
    splitBlockWithType,
    updateBlockType,
} from './commands';
import {
    type BlockContext,
    createBlockContext,
    getSelectionOffset,
    isEmptyDialogueBlock,
    isInsideParentheses,
} from './context';

const MAX_ACTION_INDENT = 3;

type HandlerMap<T> = Partial<Record<FountainBlockType, T>>;

const enterHandlers: HandlerMap<(context: BlockContext) => boolean> = {
    [ELEMENT_CHARACTER]: context => {
        if (context.isAtStart) {
            return insertActionBefore(context.editor, context.block.pos, context.block.from);
        }

        return splitBlockWithType(context.editor, ELEMENT_DIALOGUE);
    },
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: context => splitBlockWithType(context.editor, ELEMENT_DIALOGUE),
    [ELEMENT_DIALOGUE]: context => splitBlockWithType(context.editor, ELEMENT_CHARACTER),
    [ELEMENT_PARENTHETICAL]: context => splitBlockWithType(context.editor, ELEMENT_CHARACTER),
};

const shiftEnterHandlers: HandlerMap<(context: BlockContext) => boolean> = {
    [ELEMENT_CHARACTER]: context => splitBlockWithType(context.editor, ELEMENT_DIALOGUE),
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: context => splitBlockWithType(context.editor, ELEMENT_DIALOGUE),
    [ELEMENT_DIALOGUE]: context => splitBlockWithType(context.editor, ELEMENT_DIALOGUE),
    [ELEMENT_PARENTHETICAL]: context => splitBlockWithType(context.editor, ELEMENT_CHARACTER),
};

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
    [ELEMENT_DIALOGUE]: (context, event) => {
        event.preventDefault();

        return updateBlockType(context.editor, ELEMENT_PARENTHETICAL);
    },
    [ELEMENT_PARENTHETICAL]: (context, event) => {
        event.preventDefault();

        return updateBlockType(context.editor, ELEMENT_DIALOGUE);
    },
    [ELEMENT_ACTION]: handleActionTab,
};

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

const handleCharacterInput = (
    context: BlockContext,
    from: number,
    to: number,
    text: string,
) => {
    if (text === '(') {
        insertParenPair(context.editor, from, to);

        return true;
    }

    const offset = getSelectionOffset(context.editor, context.block.from);
    const insideParens = isInsideParentheses(context.block.node.textContent ?? '', offset);

    if (!insideParens) {
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
    [ELEMENT_CHARACTER]: handleCharacterInput,
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: handleCharacterInput,
    [ELEMENT_PARENTHETICAL]: handleParentheticalInput,
};

const pasteHandlers: HandlerMap<(context: BlockContext, event: ClipboardEvent) => boolean> = {
    [ELEMENT_PARENTHETICAL]: (context, event) => {
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

export const handleEnter = (editor: Editor, event: KeyboardEvent) => {
    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (!block) {
        return false;
    }

    event.preventDefault();

    if (!editor.state.selection.empty) {
        editor.commands.deleteSelection();
    }

    if (isEmptyDialogueBlock(block)) {
        return setBlockTypeWithSelection(editor, block, ELEMENT_CHARACTER);
    }

    const context = createBlockContext(editor, block);
    const handler = event.shiftKey
        ? shiftEnterHandlers[block.blockType]
        : enterHandlers[block.blockType];

    if (handler) {
        return handler(context);
    }

    const nextType = context.isAtEnd
        ? getNextTypeOnEnter(block.blockType)
        : block.blockType;

    return splitBlockWithType(editor, nextType);
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

    return false;
};

export const handleKeyDown = (editor: Editor, event: KeyboardEvent) => {
    if (event.key === 'Enter') {
        return handleEnter(editor, event);
    }

    if (event.key === 'Tab') {
        return handleTab(editor, event);
    }

    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (!block) {
        return false;
    }

    const handler = keyDownHandlers[block.blockType];

    if (!handler) {
        return false;
    }

    return handler(createBlockContext(editor, block), event);
};

export const handleTextInput = (editor: Editor, from: number, to: number, text: string) => {
    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (!block) {
        return false;
    }

    const handler = textInputHandlers[block.blockType];

    if (!handler) {
        return false;
    }

    return handler(createBlockContext(editor, block), from, to, text);
};

export const handlePaste = (editor: Editor, event: ClipboardEvent) => {
    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (!block) {
        return false;
    }

    const handler = pasteHandlers[block.blockType];

    if (!handler) {
        return false;
    }

    return handler(createBlockContext(editor, block), event);
};

export const fountainBlockHandlerMaps = {
    enterHandlers,
    shiftEnterHandlers,
    tabHandlers,
    keyDownHandlers,
    textInputHandlers,
    pasteHandlers,
};
