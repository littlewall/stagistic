import {
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    normalizeCharacterEditorDelimiters,
} from '@stagistic/editor-core';
import {
    type BlockCasing,
    type BlockShortcut,
    isBlockShortcut,
} from '@stagistic/shared';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {FOUNTAIN_BLOCK_TYPES} from '../../blocks/fountain';
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
export type BlockShortcutMap = Partial<Record<FountainBlockType, BlockShortcut>>;
export type BlockNextElementMap = Partial<Record<FountainBlockType, FountainBlockType>>;
export type BlockCasingMap = Partial<Record<FountainBlockType, BlockCasing>>;

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

const isApplePlatform = () => {
    if (typeof navigator === 'undefined') {
        return false;
    }

    const platform = navigator.platform || navigator.userAgent;

    return (/mac|iphone|ipad|ipod/i).test(platform);
};

const hasShortcutModifier = (event: KeyboardEvent) => {
    if (isApplePlatform()) {
        return event.metaKey && !event.ctrlKey;
    }

    return event.ctrlKey && !event.metaKey;
};

const findBlockTypeByShortcut = (
    shortcut: BlockShortcut,
    blockShortcuts?: BlockShortcutMap,
): FountainBlockType | null => {
    if (!blockShortcuts) {
        return null;
    }

    for (const blockType of FOUNTAIN_BLOCK_TYPES) {
        if (blockShortcuts[blockType] === shortcut) {
            return normalizeFountainBlockType(blockType);
        }
    }

    return null;
};

const handleBlockShortcut = (
    editor: Editor,
    event: KeyboardEvent,
    blockShortcuts?: BlockShortcutMap,
) => {
    if (event.altKey || event.shiftKey || !hasShortcutModifier(event)) {
        return false;
    }

    if (!isBlockShortcut(event.key)) {
        return false;
    }

    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (!block) {
        return false;
    }

    const nextType = findBlockTypeByShortcut(event.key, blockShortcuts);

    if (!nextType) {
        return false;
    }

    event.preventDefault();

    if (nextType === block.blockType) {
        return true;
    }

    return updateBlockType(editor, nextType, block.id);
};

const resolveNextTypeOnEnter = (
    blockType: FountainBlockType,
    blockNextElements?: BlockNextElementMap,
) => {
    const configured = blockNextElements?.[blockType];

    return configured ?? getNextTypeOnEnter(blockType);
};

const enterHandlers: HandlerMap<(context: BlockContext, blockNextElements?: BlockNextElementMap) => boolean> = {
    [ELEMENT_CHARACTER]: (context, blockNextElements) => {
        if (context.isAtStart) {
            return insertActionBefore(context.editor, context.block.pos, context.block.from);
        }

        return splitBlockWithType(
            context.editor,
            resolveNextTypeOnEnter(ELEMENT_CHARACTER, blockNextElements),
        );
    },
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: (_context, blockNextElements) => splitBlockWithType(
        _context.editor,
        resolveNextTypeOnEnter(ELEMENT_DUAL_DIALOGUE_CHARACTER, blockNextElements),
    ),
    [ELEMENT_DIALOGUE]: (_context, blockNextElements) => splitBlockWithType(
        _context.editor,
        resolveNextTypeOnEnter(ELEMENT_DIALOGUE, blockNextElements),
    ),
    [ELEMENT_LYRICS]: (_context, blockNextElements) => splitBlockWithType(
        _context.editor,
        resolveNextTypeOnEnter(ELEMENT_LYRICS, blockNextElements),
    ),
    [ELEMENT_PARENTHETICAL]: (_context, blockNextElements) => splitBlockWithType(
        _context.editor,
        resolveNextTypeOnEnter(ELEMENT_PARENTHETICAL, blockNextElements),
    ),
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

export const handleEnter = (
    editor: Editor,
    event: KeyboardEvent,
    blockNextElements?: BlockNextElementMap,
) => {
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

    if (event.shiftKey) {
        const shiftHandler = shiftEnterHandlers[block.blockType];

        if (shiftHandler) {
            return shiftHandler(context);
        }
    } else {
        const enterHandler = enterHandlers[block.blockType];

        if (enterHandler) {
            return enterHandler(context, blockNextElements);
        }
    }

    const nextType = context.isAtEnd
        ? resolveNextTypeOnEnter(block.blockType, blockNextElements)
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

export const handleKeyDown = (
    editor: Editor,
    event: KeyboardEvent,
    blockShortcuts?: BlockShortcutMap,
    blockNextElements?: BlockNextElementMap,
) => {
    if (handleBlockShortcut(editor, event, blockShortcuts)) {
        return true;
    }

    if (event.key === 'Enter') {
        return handleEnter(editor, event, blockNextElements);
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
