import {Extension} from '@tiptap/core';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
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

type PlaceholderPluginState = {
    decorations: DecorationSet,
    dismissed: boolean,
};

const placeholderPluginKey = new PluginKey<PlaceholderPluginState>('script-placeholder');

const hasInlineAtom = (node: ProseMirrorNode) => {
    let found = false;

    node.descendants(child => {
        if (child.isLeaf && !child.isText) {
            found = true;
        }

        return !found;
    });

    return found;
};

const isFreshEmptyDocument = (state: EditorState) => {
    if (state.doc.childCount === 0) {
        return true;
    }

    let isEmpty = true;

    state.doc.forEach(node => {
        const text = node.textContent.trim();
        const isDefaultActHeading = node.type.name === 'act' && text.toLocaleUpperCase() === 'ACT ONE';

        if ((!isDefaultActHeading && text.length > 0) || hasInlineAtom(node)) {
            isEmpty = false;
        }
    });

    return isEmpty;
};

const buildPlaceholderDecorations = (
    state: EditorState,
    placeholder: string,
    dismissed: boolean,
) => {
    try {
        const activeBlock = getActiveScriptBlockFromState(state);

        if (dismissed
            || !isFreshEmptyDocument(state)
            || !activeBlock
            || (activeBlock.node.textContent ?? '').trim().length > 0) {
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
            placeholder: 'Start writing…',
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin<PlaceholderPluginState>({
                key: placeholderPluginKey,
                state: {
                    init: (_config, state) => ({
                        decorations: buildPlaceholderDecorations(
                            state,
                            this.options.placeholder,
                            false,
                        ),
                        dismissed: false,
                    }),
                    apply: (tr, pluginState, _oldState, newState) => {
                        const dismissed = pluginState.dismissed
                            || tr.getMeta(placeholderPluginKey) === 'dismiss';

                        if (!tr.docChanged && !tr.selectionSet && dismissed === pluginState.dismissed) {
                            return pluginState;
                        }

                        return {
                            decorations: buildPlaceholderDecorations(
                                newState,
                                this.options.placeholder,
                                dismissed,
                            ),
                            dismissed,
                        };
                    },
                },
                props: {
                    decorations: state => {
                        return placeholderPluginKey.getState(state)?.decorations ?? DecorationSet.empty;
                    },
                    handleDOMEvents: {
                        keydown: view => {
                            view.dispatch(view.state.tr.setMeta(placeholderPluginKey, 'dismiss'));

                            return false;
                        },
                        mousedown: view => {
                            view.dispatch(view.state.tr.setMeta(placeholderPluginKey, 'dismiss'));

                            return false;
                        },
                    },
                },
            }),
        ];
    },
});
