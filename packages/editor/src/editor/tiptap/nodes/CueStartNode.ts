import {
    CUE_ID_ATTR,
    CUE_KIND_ATTR,
    CUE_MODE_ATTR,
    CUE_START_NODE_NAME,
    CUE_TITLE_ATTR,
} from '@stagistic/script';
import {
    mergeAttributes,
    Node,
} from '@tiptap/core';
import {ReactNodeViewRenderer} from '@tiptap/react';

import {CueStartPill} from './CuePill';

const readMode = (value: unknown) => {
    return value === 'hit' ? 'hit' : 'open';
};

export const CueStartNode = Node.create({
    name: CUE_START_NODE_NAME,
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    draggable: false,

    addAttributes() {
        return {
            [CUE_ID_ATTR]: {
                default: '',
                parseHTML: element => element.getAttribute('data-cue-id') ?? '',
                renderHTML: attributes => ({'data-cue-id': String(attributes[CUE_ID_ATTR] ?? '')}),
            },
            [CUE_MODE_ATTR]: {
                default: 'open',
                parseHTML: element => readMode(element.getAttribute('data-cue-mode')),
                renderHTML: attributes => ({'data-cue-mode': readMode(attributes[CUE_MODE_ATTR] ?? null)}),
            },
            [CUE_TITLE_ATTR]: {
                default: '',
                parseHTML: element => element.getAttribute('data-cue-title') ?? '',
                renderHTML: attributes => ({'data-cue-title': String(attributes[CUE_TITLE_ATTR] ?? '')}),
            },
            [CUE_KIND_ATTR]: {
                default: null,
                parseHTML: element => element.getAttribute('data-cue-kind'),
                renderHTML: attributes => {
                    const kind: unknown = attributes[CUE_KIND_ATTR];

                    return typeof kind === 'string' && kind.length > 0 ? {'data-cue-kind': kind} : {};
                },
            },
        };
    },

    parseHTML() {
        return [{tag: 'span[data-cue-pill="start"]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['span', mergeAttributes(HTMLAttributes, {'data-cue-pill': 'start'})];
    },

    addNodeView() {
        return ReactNodeViewRenderer(CueStartPill);
    },
});
