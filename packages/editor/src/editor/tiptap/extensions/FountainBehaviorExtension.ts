import {Extension} from '@tiptap/core';
import {Plugin} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {
    type BlockCasingMap,
    type BlockNextElementMap,
    type BlockShortcutMap,
    handleKeyDown,
    handlePaste,
    handleTextInput,
} from '../fountainBlock/handlers';

const createInputHandlersPlugin = (
    editor: Editor,
    blockShortcuts?: BlockShortcutMap,
    blockNextElements?: BlockNextElementMap,
    blockCasing?: BlockCasingMap,
) => {
    return new Plugin({
        props: {
            handleKeyDown: (_view, event) => handleKeyDown(editor, event, blockShortcuts, blockNextElements),
            handleTextInput: (_view, from, to, text) => handleTextInput(editor, from, to, text, blockCasing),
            handlePaste: (_view, event) => handlePaste(editor, event),
        },
    });
};

export const FountainBehaviorExtension = Extension.create<{
    blockShortcuts?: BlockShortcutMap,
    blockNextElements?: BlockNextElementMap,
    blockCasing?: BlockCasingMap,
}>({
    name: 'FountainBehavior',

    addOptions() {
        return {
            blockShortcuts: undefined,
            blockNextElements: undefined,
            blockCasing: undefined,
        };
    },

    addProseMirrorPlugins() {
        return [
            createInputHandlersPlugin(
                this.editor,
                this.options.blockShortcuts,
                this.options.blockNextElements,
                this.options.blockCasing,
            ),
        ];
    },
});
