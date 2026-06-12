import {isApplePlatform} from '@stagistic/shared';
import type {Editor} from '@tiptap/react';

import {getEmptyEnterChooserFromState} from '../../extensions/EmptyEnterChooserExtension';
import {FOUNTAIN_BLOCK_NODE_NAME, getActiveFountainBlockFromState} from '../../fountainCore';
import {createBlockContext} from '../context';
import {enterHandlerMaps, handleEnter} from './enter';
import {handlePaste, pasteHandlerMaps} from './paste';
import {handleBlockShortcut, handleBlockTypeCycle} from './shortcuts';
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

const hasShortcutModifier = (event: KeyboardEvent) => {
    if (isApplePlatform()) {
        return event.metaKey && !event.ctrlKey;
    }

    return event.ctrlKey && !event.metaKey;
};

interface EmptyEnterChooserCommands {
    closeEmptyEnterChooser?: () => boolean,
    moveEmptyEnterChooserSelection?: (direction: -1 | 1) => boolean,
    confirmEmptyEnterChooserType?: () => boolean,
    insertNextEmptyFromEmptyEnterChooser?: () => boolean,
}

const getEmptyEnterChooserCommands = (editor: Editor): EmptyEnterChooserCommands => {
    return editor.commands as EmptyEnterChooserCommands;
};

export const handleKeyDown = (
    editor: Editor,
    event: KeyboardEvent,
    blockShortcuts?: BlockShortcutMap,
    blockNextElements?: BlockNextElementMap,
) => {
    const emptyEnterChooserState = getEmptyEnterChooserFromState(editor.state);

    if (emptyEnterChooserState.isOpen) {
        const chooserCommands = getEmptyEnterChooserCommands(editor);

        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            chooserCommands.closeEmptyEnterChooser?.();

            return true;
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            event.stopPropagation();
            chooserCommands.moveEmptyEnterChooserSelection?.(-1);

            return true;
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            event.stopPropagation();
            chooserCommands.moveEmptyEnterChooserSelection?.(1);

            return true;
        }

        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            chooserCommands.closeEmptyEnterChooser?.();

            return false;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();

            if (hasShortcutModifier(event)) {
                chooserCommands.insertNextEmptyFromEmptyEnterChooser?.();

                return true;
            }

            chooserCommands.confirmEmptyEnterChooserType?.();

            return true;
        }

        chooserCommands.closeEmptyEnterChooser?.();
    }

    if (handleBlockShortcut(editor, event, blockShortcuts)) {
        return true;
    }

    if (event.key === 'Enter' && event.altKey && !event.metaKey && !event.ctrlKey) {
        return handleBlockTypeCycle(editor, event);
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
