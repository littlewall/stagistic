import {MUSIC_OUT_NODE_NAME} from '@stagistic/script';
import {
    mergeAttributes,
    Node,
} from '@tiptap/core';
import {ReactNodeViewRenderer} from '@tiptap/react';
import {createElement} from 'react';

import {MusicOutPill} from './MusicOutPill';

interface MusicOutNodeOptions {
    onOpenMusicManager?: (musicId: string) => void,
}

export const MusicOutNode = Node.create<MusicOutNodeOptions>({
    name: MUSIC_OUT_NODE_NAME,
    group: 'inline',
    inline: true,
    atom: true,
    selectable: false,
    draggable: false,

    parseHTML() {
        return [{tag: 'span[data-music-pill="out"]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['span', mergeAttributes(HTMLAttributes, {'data-music-pill': 'out'})];
    },

    addOptions() {
        return {};
    },

    addNodeView() {
        return ReactNodeViewRenderer(props => createElement(MusicOutPill, {
            ...props,
            onOpenMusicManager: this.options.onOpenMusicManager,
        }));
    },
});
