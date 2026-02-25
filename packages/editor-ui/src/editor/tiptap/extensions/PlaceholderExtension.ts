import {Extension} from '@tiptap/core';
import {Plugin, PluginKey} from '@tiptap/pm/state';
import {Decoration, DecorationSet} from '@tiptap/pm/view';

import {isFountainBlockNodeName} from '../fountainCore';

const placeholderPluginKey = new PluginKey('fountain-placeholder');

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
            new Plugin({
                key: placeholderPluginKey,
                props: {
                    decorations: state => {
                        const decorations: Decoration[] = [];

                        state.doc.descendants((node, pos) => {
                            if (!isFountainBlockNodeName(node.type.name)) {
                                return true;
                            }

                            if ((node.textContent ?? '').trim().length > 0) {
                                return false;
                            }

                            decorations.push(
                                Decoration.node(pos, pos + node.nodeSize, {
                                    'data-placeholder': this.options.placeholder,
                                }),
                            );

                            return false;
                        });

                        if (decorations.length === 0) {
                            return null;
                        }

                        return DecorationSet.create(state.doc, decorations);
                    },
                },
            }),
        ];
    },
});
