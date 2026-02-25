import {
    ELEMENT_ACTION,
    type FountainElementType,
    resolveLegacyFountainBlockType,
} from '@stagistic/script-core';
import {Extension} from '@tiptap/core';
import {Plugin, PluginKey} from '@tiptap/pm/state';
import {Decoration, DecorationSet} from '@tiptap/pm/view';

import {isFountainBlockNodeName, normalizeFountainBlockType} from '../fountainCore';

const layerViewFilterPluginKey = new PluginKey('layer-view-filter');

const normalizeBlockTypeSet = (values?: readonly FountainElementType[]) => {
    if (!values || values.length === 0) {
        return null;
    }

    return new Set(values.map(value => normalizeFountainBlockType(value)));
};

const resolveBlockType = (node: {
    type: {name: string},
    attrs: Record<string, unknown>,
}) => {
    const resolvedBlockType = resolveLegacyFountainBlockType(node.type.name)
        ?? node.attrs.blockType
        ?? ELEMENT_ACTION;

    return normalizeFountainBlockType(resolvedBlockType);
};

export const LayerViewFilterExtension = Extension.create<{
    visibleBlockTypes?: readonly FountainElementType[],
}>({
    name: 'LayerViewFilter',

    addOptions() {
        return {
            visibleBlockTypes: undefined,
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: layerViewFilterPluginKey,
                props: {
                    decorations: state => {
                        const visibleBlockTypeSet = normalizeBlockTypeSet(this.options.visibleBlockTypes);

                        if (!visibleBlockTypeSet || visibleBlockTypeSet.size === 0) {
                            return null;
                        }

                        const decorations: Decoration[] = [];

                        state.doc.descendants((node, pos) => {
                            if (!isFountainBlockNodeName(node.type.name)) {
                                return true;
                            }

                            const blockType = resolveBlockType(node as {
                                type: {name: string},
                                attrs: Record<string, unknown>,
                            });

                            if (visibleBlockTypeSet.has(blockType)) {
                                return false;
                            }

                            decorations.push(
                                Decoration.node(pos, pos + node.nodeSize, {
                                    style: 'display:none',
                                    'data-view-filter-hidden': 'true',
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
