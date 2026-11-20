import {
    getScriptBlockNodeType,
    resolveBlockSpacingGroups,
    type ScriptDocument,
} from '@stagistic/script';
import {Extension} from '@tiptap/core';
import type {Node} from '@tiptap/pm/model';
import {Plugin, PluginKey} from '@tiptap/pm/state';
import {Decoration, DecorationSet} from '@tiptap/pm/view';

const key = new PluginKey<DecorationSet>('block-spacing');
const buildDecorations = (doc: Node) => {
    const {content} = doc.toJSON() as ScriptDocument;
    const edges = resolveBlockSpacingGroups(content);
    const decorations: Decoration[] = [];

    doc.forEach((node, pos, index) => {
        const edge = edges[index];
        const type = getScriptBlockNodeType(content[index]);
        const prefix = type === 'stageDirection' ? 'stage-direction' : type;
        const style = [
            !edge.before ? `--${prefix}-spacing-before:0px` : '',
            !edge.after ? `--${prefix}-spacing-after:0px` : '',
        ].filter(Boolean).join(';');

        if (style) decorations.push(Decoration.node(pos, pos + node.nodeSize, {style}));
    });

    return DecorationSet.create(doc, decorations);
};

/** Derived DOM decorations only; no attributes are added to the saved script. */
export const BlockSpacingExtension = Extension.create({
    name: 'blockSpacing',
    addProseMirrorPlugins() {
        return [
            new Plugin<DecorationSet>({
                key,
                state: {
                    init: (_config, state) => buildDecorations(state.doc),
                    apply: (tr, previous) => tr.docChanged ? buildDecorations(tr.doc) : previous,
                },
                props: {decorations: state => key.getState(state)},
            }),
        ];
    },
});
