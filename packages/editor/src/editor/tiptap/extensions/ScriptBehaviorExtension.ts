import {Extension} from '@tiptap/core';
import {Plugin} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {
    copyVisibleScriptSelection,
    transformCopiedScriptSlice,
} from '../scriptBlock/clipboard';
import {
    type BlockCasingMap,
    type BlockNextElementMap,
    type BlockShortcutMap,
    handleKeyDown,
    handlePaste,
    handleTextInput,
} from '../scriptBlock/handlers';

const createInputHandlersPlugin = (
    editor: Editor,
    blockShortcuts?: BlockShortcutMap,
    blockNextElements?: BlockNextElementMap,
    blockCasing?: BlockCasingMap,
    getSettings?: () => {
        blockShortcuts: BlockShortcutMap,
        blockNextElements: BlockNextElementMap,
        blockCasing: BlockCasingMap,
    },
) => {
    return new Plugin({
        props: {
            handleDOMEvents: {
                copy: (view, event) => copyVisibleScriptSelection(view, event),
            },
            handleKeyDown: (_view, event) => {
                const currentSettings = getSettings?.();

                return handleKeyDown(editor, event, currentSettings?.blockShortcuts ?? blockShortcuts, currentSettings?.blockNextElements ?? blockNextElements);
            },
            handleTextInput: (_view, from, to, text) => handleTextInput(editor, from, to, text, getSettings?.().blockCasing ?? blockCasing),
            handlePaste: (_view, event) => handlePaste(editor, event),
            transformCopied: (slice, view) => transformCopiedScriptSlice(slice, view.state),
        },
    });
};

export const ScriptBehaviorExtension = Extension.create<{
    blockShortcuts?: BlockShortcutMap,
    blockNextElements?: BlockNextElementMap,
    blockCasing?: BlockCasingMap,
    getSettings?: () => {
        blockShortcuts: BlockShortcutMap,
        blockNextElements: BlockNextElementMap,
        blockCasing: BlockCasingMap,
    },
}>({
    name: 'ScriptBehavior',

    addOptions() {
        return {
            blockShortcuts: undefined,
            blockNextElements: undefined,
            blockCasing: undefined,
            getSettings: undefined,
        };
    },

    addProseMirrorPlugins() {
        return [
            createInputHandlersPlugin(
                this.editor,
                this.options.blockShortcuts,
                this.options.blockNextElements,
                this.options.blockCasing,
                this.options.getSettings,
            ),
        ];
    },
});
