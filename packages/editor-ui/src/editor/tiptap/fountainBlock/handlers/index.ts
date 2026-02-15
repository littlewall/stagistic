import type {Editor} from '@tiptap/react';

import {FOUNTAIN_BLOCK_NODE_NAME, getActiveFountainBlockFromState} from '../../fountainCore';
import {createBlockContext} from '../context';
import {enterHandlerMaps, handleEnter} from './enter';
import {handlePaste, pasteHandlerMaps} from './paste';
import {handleBlockShortcut} from './shortcuts';
import {handleTab, tabHandlerMaps} from './tab';
import {handleTextInput, textInputHandlerMaps} from './textInput';
import {
    type BlockCasingMap,
    type BlockNextElementMap,
    type BlockShortcutMap,
} from './types';

export type {
    BlockCasingMap,
    BlockNextElementMap,
    BlockShortcutMap,
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

    const handler = textInputHandlerMaps.keyDownHandlers[block.blockType];

    if (!handler) {
        return false;
    }

    return handler(createBlockContext(editor, block), event);
};

export {
    handleEnter,
    handlePaste,
    handleTab,
    handleTextInput,
};

export const fountainBlockHandlerMaps = {
    ...enterHandlerMaps,
    ...tabHandlerMaps,
    ...textInputHandlerMaps,
    ...pasteHandlerMaps,
};
