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
