import {
    ELEMENT_ACTION,
    type FountainElementType,
    resolveLegacyFountainBlockType,
} from '@stagistic/script-core';
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

import {incrementLayerFilterDecorationRebuildCount} from '../../perf/editorPerfMetrics';
import {transactionMayAffectBlockStructure} from '../../runtime/transactionGuards';
import {isFountainBlockNodeName, normalizeFountainBlockType} from '../fountainCore';

const layerViewFilterPluginKey = new PluginKey<DecorationSet>('layer-view-filter');

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

const buildDecorations = (state: EditorState, visibleBlockTypes?: readonly FountainElementType[]) => {
    try {
        const visibleBlockTypeSet = normalizeBlockTypeSet(visibleBlockTypes);

        if (!visibleBlockTypeSet || visibleBlockTypeSet.size === 0) {
            return DecorationSet.empty;
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

            if (!visibleBlockTypeSet.has(blockType)) {
                decorations.push(
                    Decoration.node(pos, pos + node.nodeSize, {
                        style: 'display:none',
                        'data-view-filter-hidden': 'true',
                    }),
                );
            }

            return false;
        });

        incrementLayerFilterDecorationRebuildCount();

        return decorations.length > 0
            ? DecorationSet.create(state.doc, decorations)
            : DecorationSet.empty;
    } catch {
        return DecorationSet.empty;
    }
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
            new Plugin<DecorationSet>({
                key: layerViewFilterPluginKey,
                state: {
                    init: (_config, state) => buildDecorations(state, this.options.visibleBlockTypes),
                    apply: (tr, pluginState, _oldState, newState) => {
                        if (!tr.docChanged) {
                            return pluginState;
                        }

                        if (!transactionMayAffectBlockStructure(tr)) {
                            return pluginState.map(tr.mapping, tr.doc);
                        }

                        return buildDecorations(newState, this.options.visibleBlockTypes);
                    },
                },
                props: {
                    decorations: state => layerViewFilterPluginKey.getState(state) ?? DecorationSet.empty,
                },
            }),
        ];
    },
});
