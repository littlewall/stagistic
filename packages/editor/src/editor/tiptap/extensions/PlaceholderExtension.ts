import {Extension} from '@tiptap/core';
import {
    type EditorState,
    Plugin,
    PluginKey,
} from '@tiptap/pm/state';
import {
    Decoration,
    DecorationSet,
} from '@tiptap/pm/view';

import {getActiveScriptBlockFromState} from '../scriptCore';

const placeholderPluginKey = new PluginKey<DecorationSet>('fountain-placeholder');

const buildPlaceholderDecorations = (state: EditorState, placeholder: string) => {
    try {
        const activeBlock = getActiveScriptBlockFromState(state);

        if (!activeBlock || (activeBlock.node.textContent ?? '').trim().length > 0) {
            return DecorationSet.empty;
        }

        return DecorationSet.create(state.doc, [
            Decoration.node(activeBlock.pos, activeBlock.pos + activeBlock.node.nodeSize, {
                'data-placeholder': placeholder,
            }),
        ]);
    } catch {
        return DecorationSet.empty;
    }
};

export const PlaceholderExtension = Extension.create<{
    placeholder: string,
}>({
    name: 'Placeholder',

    addOptions() {
        return {
            placeholder: 'Start writing your script',
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin<DecorationSet>({
                key: placeholderPluginKey,
                state: {
                    init: (_config, state) => buildPlaceholderDecorations(state, this.options.placeholder),
                    apply: (tr, pluginState, _oldState, newState) => {
                        if (!tr.docChanged && !tr.selectionSet) {
                            return pluginState;
                        }

                        return buildPlaceholderDecorations(newState, this.options.placeholder);
                    },
                },
                props: {
                    decorations: state => placeholderPluginKey.getState(state) ?? DecorationSet.empty,
                },
            }),
        ];
    },
});
