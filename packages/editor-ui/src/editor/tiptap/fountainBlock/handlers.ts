import {
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
} from '@stagistic/editor-core';
import type {Editor} from '@tiptap/react';

import {
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainBlockType,
    getActiveFountainBlockFromState,
    getNextTypeOnEnter,
    normalizeFountainBlockType,
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
    isEmptyDialogueLikeBlock,
    isInsideParentheses,
} from './context';

type HandlerMap<T> = Partial<Record<FountainBlockType, T>>;
type DialogueLikeBlockType = typeof ELEMENT_DIALOGUE | typeof ELEMENT_LYRICS;
type FountainBlockEntry = {
    pos: number,
    blockType: FountainBlockType,
};

const MAX_ACTION_INDENT = 3;

const isDialogueLikeType = (blockType: FountainBlockType): blockType is DialogueLikeBlockType => {
    return blockType === ELEMENT_DIALOGUE || blockType === ELEMENT_LYRICS;
};

const collectFountainBlocks = (editor: Editor) => {
    const blocks: FountainBlockEntry[] = [];

    editor.state.doc.descendants((node, pos) => {
        if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
            return true;
        }

        blocks.push({
            pos,
            blockType: normalizeFountainBlockType(node.attrs.blockType),
        });

        return false;
    });

    return blocks;
};

const findNearestDialogueLikeType = (
    blocks: FountainBlockEntry[],
    blockIndex: number,
    direction: -1 | 1,
): DialogueLikeBlockType | null => {
    for (let index = blockIndex + direction; index >= 0 && index < blocks.length; index += direction) {
        const {blockType} = blocks[index];

        if (isDialogueLikeType(blockType)) {
            return blockType;
        }
    }

    return null;
};

const resolveParentheticalTabTarget = (editor: Editor, blockPos: number): DialogueLikeBlockType => {
    const blocks = collectFountainBlocks(editor);
    const blockIndex = blocks.findIndex(({pos}) => pos === blockPos);

    if (blockIndex < 0) {
        return ELEMENT_DIALOGUE;
    }

    return findNearestDialogueLikeType(blocks, blockIndex, -1)
        ?? findNearestDialogueLikeType(blocks, blockIndex, 1)
        ?? ELEMENT_DIALOGUE;
};

const enterHandlers: HandlerMap<(context: BlockContext) => boolean> = {
    [ELEMENT_CHARACTER]: context => {
        if (context.isAtStart) {
            return insertActionBefore(context.editor, context.block.pos, context.block.from);
        }

        return splitBlockWithType(context.editor, ELEMENT_DIALOGUE);
    },
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: context => splitBlockWithType(context.editor, ELEMENT_DIALOGUE),
    [ELEMENT_DIALOGUE]: context => splitBlockWithType(context.editor, ELEMENT_CHARACTER),
    [ELEMENT_LYRICS]: context => splitBlockWithType(context.editor, ELEMENT_CHARACTER),
    [ELEMENT_PARENTHETICAL]: context => splitBlockWithType(context.editor, ELEMENT_CHARACTER),
};

const shiftEnterHandlers: HandlerMap<(context: BlockContext) => boolean> = {
    [ELEMENT_CHARACTER]: context => splitBlockWithType(context.editor, ELEMENT_DIALOGUE),
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: context => splitBlockWithType(context.editor, ELEMENT_DIALOGUE),
    [ELEMENT_DIALOGUE]: context => splitBlockWithType(context.editor, ELEMENT_DIALOGUE),
    [ELEMENT_LYRICS]: context => splitBlockWithType(context.editor, ELEMENT_LYRICS),
    [ELEMENT_PARENTHETICAL]: context => splitBlockWithType(
        context.editor,
        resolveParentheticalTabTarget(context.editor, context.block.pos),
    ),
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

    if (
        block.blockType === ELEMENT_PARENTHETICAL
        && (block.node.textContent ?? '').trim().length === 0
    ) {
        return setBlockTypeWithSelection(editor, block, ELEMENT_CHARACTER);
    }

    if (isEmptyDialogueLikeBlock(block)) {
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

    event.preventDefault();

    return true;
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
