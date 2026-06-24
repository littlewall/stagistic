import {CUE_OUT_NODE_NAME} from '@stagistic/script';
import {
    mergeAttributes,
    Node,
} from '@tiptap/core';
import {ReactNodeViewRenderer} from '@tiptap/react';

import {CueOutPill} from './CuePill';

export const CueOutNode = Node.create({
    name: CUE_OUT_NODE_NAME,
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    draggable: false,

    parseHTML() {
        return [{tag: 'span[data-cue-pill="out"]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['span', mergeAttributes(HTMLAttributes, {'data-cue-pill': 'out'})];
    },

    addNodeView() {
        return ReactNodeViewRenderer(CueOutPill);
    },
});
