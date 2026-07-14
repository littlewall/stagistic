import {CUE_OUT_NODE_NAME} from '@stagistic/script';
import {
    mergeAttributes,
    Node,
} from '@tiptap/core';
import {ReactNodeViewRenderer} from '@tiptap/react';
import {createElement} from 'react';

import {CueOutPill} from './CueOutPill';

interface CueOutNodeOptions {
    onOpenCueManager?: (cueId: string) => void,
}

export const CueOutNode = Node.create<CueOutNodeOptions>({
    name: CUE_OUT_NODE_NAME,
    group: 'inline',
    inline: true,
    atom: true,
    selectable: false,
    draggable: false,

    parseHTML() {
        return [{tag: 'span[data-cue-pill="out"]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['span', mergeAttributes(HTMLAttributes, {'data-cue-pill': 'out'})];
    },

    addOptions() {
        return {};
    },

    addNodeView() {
        return ReactNodeViewRenderer(props => createElement(CueOutPill, {
            ...props,
            onOpenCueManager: this.options.onOpenCueManager,
        }));
    },
});
