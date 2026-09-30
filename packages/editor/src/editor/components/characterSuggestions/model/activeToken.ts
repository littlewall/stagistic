import {splitCharacterTokens} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {getActiveScriptBlockFromState} from '../../../tiptap/scriptCore';
import {getActiveTokenIndex} from './tokenUtils';

type ActiveTokenResult = {
    text: string,
    tokens: ReturnType<typeof splitCharacterTokens>,
    offset: number,
    activeTokenIndex: number,
    activeToken: NonNullable<ReturnType<typeof splitCharacterTokens>[number]>,
};

export const resolveActiveToken = (editor: TiptapEditor, block: NonNullable<ReturnType<typeof getActiveScriptBlockFromState>>): ActiveTokenResult | null => {
    const text = block.node.textContent ?? '';
    const tokens = splitCharacterTokens(text);
    const offset = Math.max(0, editor.state.selection.from - block.from);
    const activeTokenIndex = getActiveTokenIndex(text, offset);
    const activeToken = tokens[activeTokenIndex];

    return activeToken
        ? {
            text,
            tokens,
            offset,
            activeTokenIndex,
            activeToken,
        }
        : null;
};
