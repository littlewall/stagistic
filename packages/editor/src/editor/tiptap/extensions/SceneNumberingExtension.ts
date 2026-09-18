import {DEFAULT_SCENE_NUMBER_FORMAT, formatSceneNumber, type SceneNumberFormat} from '@stagistic/script';
import {Extension} from '@tiptap/core';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {Plugin, PluginKey} from '@tiptap/pm/state';
import {Decoration, DecorationSet} from '@tiptap/pm/view';

import {transactionTouchesStructureBlocks} from '../../runtime/transactionGuards';
import {isScriptBlockNodeName, normalizeBlockNodeType} from '../scriptCore';

const sceneNumberingKey = new PluginKey<DecorationSet>('scene-numbering');

export interface SceneNumberingOptions {
    /** Whether and how the scene number label is rendered. */
    format: SceneNumberFormat;
}

/*
 * The scene number is a computed label, never stored or exported. Rendering it
 * as an inline widget put a non-editable node on the block's first caret
 * position, which spawned a phantom caret slot (doubled caret in empty scenes,
 * selection that couldn't extend past the block start). A node decoration keeps
 * the number entirely out of the caret/selection model: it only tags the scene
 * block with the already-formatted label in `data-scene-number`, and CSS renders
 * it via `::before`. The `none` format skips the decoration entirely so no label
 * shows. Export mirrors this label via the shared `formatSceneNumber` helper.
 */
const buildSceneNumberDecorations = (doc: ProseMirrorNode, format: SceneNumberFormat) => {
    const decorations: Decoration[] = [];
    let sceneNumber = 0;

    doc.descendants((node, pos) => {
        if (!isScriptBlockNodeName(node.type.name)) {
            return true;
        }

        if (normalizeBlockNodeType(node.attrs.blockType) === 'scene') {
            sceneNumber += 1;

            const label = formatSceneNumber(sceneNumber, format);

            if (label.length > 0) {
                decorations.push(Decoration.node(pos, pos + node.nodeSize, {'data-scene-number': label}));
            }
        }

        return false;
    });

    return DecorationSet.create(doc, decorations);
};

export const SceneNumberingExtension = Extension.create<SceneNumberingOptions>({
    name: 'sceneNumbering',

    addOptions() {
        return {
            format: DEFAULT_SCENE_NUMBER_FORMAT,
        };
    },

    addProseMirrorPlugins() {
        const {format} = this.options;

        return [
            new Plugin<DecorationSet>({
                key: sceneNumberingKey,
                state: {
                    init: (_config, state) => buildSceneNumberDecorations(state.doc, format),
                    apply: (tr, decorations, oldState) => {
                        if (!tr.docChanged) {
                            return decorations;
                        }

                        if (transactionTouchesStructureBlocks(tr, oldState.doc, tr.doc)) {
                            return buildSceneNumberDecorations(tr.doc, format);
                        }

                        return decorations.map(tr.mapping, tr.doc);
                    },
                },
                props: {
                    decorations: state => sceneNumberingKey.getState(state),
                },
            }),
        ];
    },
});
