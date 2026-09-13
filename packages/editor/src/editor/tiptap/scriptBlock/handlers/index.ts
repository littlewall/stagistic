import {isApplePlatform} from '@stagistic/shared';
import type {Editor} from '@tiptap/react';

import {getEmptyEnterChooserFromState} from '../../extensions/EmptyEnterChooserExtension';
import {handleSceneCollapseKeyDown} from '../../extensions/sceneCollapse/sceneCollapseKeyDown';
import {getActiveScriptBlockFromState, SCRIPT_BLOCK_NODE_NAMES} from '../../scriptCore';
import {createBlockContext} from '../context';
import {
    deleteSelectionPreservingScenes,
    selectionSpansScene,
} from '../deleteSelectionPreservingScenes';
import {
    deleteEmptyBlockAfterScene,
    shouldBlockBackspace,
    shouldBlockForwardDelete,
} from '../sceneDeletionGuard';
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

    if (handleSceneCollapseKeyDown(editor, event)) {
        return true;
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

    if (
        (event.key === 'Backspace' || event.key === 'Delete')
        && selectionSpansScene(editor.state)
    ) {
        event.preventDefault();

        return deleteSelectionPreservingScenes(editor);
    }

    if (event.key === 'Backspace' && deleteEmptyBlockAfterScene(editor)) {
        event.preventDefault();

        return true;
    }

    if (event.key === 'Backspace' && shouldBlockBackspace(editor.state)) {
        event.preventDefault();

        return true;
    }

    if (event.key === 'Delete' && shouldBlockForwardDelete(editor.state)) {
        event.preventDefault();

        return true;
    }

    const block = getActiveScriptBlockFromState(editor.state, SCRIPT_BLOCK_NODE_NAMES);

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

export const scriptBlockHandlerMaps = {
    ...enterHandlerMaps,
    ...tabHandlerMaps,
    ...textInputHandlerMaps,
    ...pasteHandlerMaps,
};
