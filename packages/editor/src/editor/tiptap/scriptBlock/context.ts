import type {Editor} from '@tiptap/react';

import {
    type ActiveScriptBlock,
    isScriptBlockContentEmpty,
} from '../scriptCore';

export type BlockContext = {
    editor: Editor,
    block: ActiveScriptBlock,
    isCollapsed: boolean,
    isAtStart: boolean,
    isAtEnd: boolean,
};

export const createBlockContext = (editor: Editor, block: ActiveScriptBlock): BlockContext => {
    const selection = editor.state.selection;
    const isCollapsed = selection.empty;
    const isAtStart = isCollapsed && selection.from === block.from;
    const isAtEnd = isCollapsed && selection.from === block.to;

    return {
        editor,
        block,
        isCollapsed,
        isAtStart,
        isAtEnd,
    };
};

export const getSelectionOffset = (editor: Editor, blockStart: number) => {
    const {from} = editor.state.selection;

    return Math.max(0, from - blockStart);
};

export const isInsideParentheses = (text: string, offset: number) => {
    const before = text.slice(0, Math.max(0, offset));
    const lastOpen = before.lastIndexOf('(');
    const lastClose = before.lastIndexOf(')');

    return lastOpen > lastClose;
};

export const isEmptyDialogueLikeBlock = (block: ActiveScriptBlock) => (
    block.blockType === 'dialogue'
    || block.blockType === 'lyrics'
) && isScriptBlockContentEmpty(block.node);
