import {Extension} from '@tiptap/core';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {
    Plugin,
    PluginKey,
} from '@tiptap/pm/state';
import {
    Decoration,
    DecorationSet,
} from '@tiptap/pm/view';

import {transactionTouchesStructureBlocks} from '../../runtime/transactionGuards';
import {
    isScriptBlockNodeName,
    normalizeBlockNodeType,
} from '../scriptCore';

const sceneNumberingKey = new PluginKey<DecorationSet>('scene-numbering');

/*
 * The scene number is a computed label, never stored or exported. Rendering it
 * as an inline widget put a non-editable node on the block's first caret
 * position, which spawned a phantom caret slot (doubled caret in empty scenes,
 * selection that couldn't extend past the block start). A node decoration keeps
 * the number entirely out of the caret/selection model: it only tags the scene
 * block with `data-scene-number`, and CSS renders it via `::before`.
 */
const buildSceneNumberDecorations = (doc: ProseMirrorNode) => {
    const decorations: Decoration[] = [];
    let sceneNumber = 0;

    doc.descendants((node, pos) => {
        if (!isScriptBlockNodeName(node.type.name)) {
            return true;
        }

        if (normalizeBlockNodeType(node.attrs.blockType) === 'scene') {
            sceneNumber += 1;
            decorations.push(Decoration.node(
                pos,
                pos + node.nodeSize,
                {'data-scene-number': String(sceneNumber)},
            ));
        }

        return false;
    });

    return DecorationSet.create(doc, decorations);
};

export const SceneNumberingExtension = Extension.create({
    name: 'sceneNumbering',

    addProseMirrorPlugins() {
        return [
            new Plugin<DecorationSet>({
                key: sceneNumberingKey,
                state: {
                    init: (_config, state) => buildSceneNumberDecorations(state.doc),
                    apply: (tr, decorations, oldState) => {
                        if (!tr.docChanged) {
                            return decorations;
                        }

                        if (transactionTouchesStructureBlocks(tr, oldState.doc, tr.doc)) {
                            return buildSceneNumberDecorations(tr.doc);
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
