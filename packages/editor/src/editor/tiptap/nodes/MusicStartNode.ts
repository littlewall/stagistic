import {
    MUSIC_DRAFT_ATTR,
    MUSIC_ID_ATTR,
    MUSIC_KIND_ATTR,
    MUSIC_MODE_ATTR,
    MUSIC_START_NODE_NAME,
    MUSIC_TITLE_ATTR,
} from '@stagistic/script';
import {
    mergeAttributes,
    Node,
} from '@tiptap/core';
import {ReactNodeViewRenderer} from '@tiptap/react';
import {createElement} from 'react';

import type {
    EditorMusicCreateRequest,
    EditorMusicRemoveRequest,
    PersistentMusicRef,
} from '../../contracts';
import {MusicStartPill} from './MusicPill';

const readMode = (value: unknown) => {
    return value === 'hit' ? 'hit' : 'open';
};

interface MusicStartNodeOptions {
    locked?: boolean,
    numberLabel?: string,
    onMusicAssigned?: (musicId: string) => void,
    onOpenMusicManager?: (musicId: string) => void,
    onRequestRemoveMusic?: (request: EditorMusicRemoveRequest) => void,
    onRequestCreateMusic?: (request: EditorMusicCreateRequest) => void,
    persistentMusicRef?: {current: readonly PersistentMusicRef[]},
}

export const MusicStartNode = Node.create<MusicStartNodeOptions>({
    name: MUSIC_START_NODE_NAME,
    group: 'inline',
    inline: true,
    atom: true,
    selectable: false,
    draggable: false,

    addAttributes() {
        return {
            [MUSIC_ID_ATTR]: {
                default: '',
                parseHTML: element => element.getAttribute('data-music-id') ?? '',
                renderHTML: attributes => ({'data-music-id': String(attributes[MUSIC_ID_ATTR] ?? '')}),
            },
            [MUSIC_MODE_ATTR]: {
                default: 'open',
                parseHTML: element => readMode(element.getAttribute('data-music-mode')),
                renderHTML: attributes => ({'data-music-mode': readMode(attributes[MUSIC_MODE_ATTR] ?? null)}),
            },
            [MUSIC_TITLE_ATTR]: {
                default: '',
                parseHTML: element => element.getAttribute('data-music-title') ?? '',
                renderHTML: attributes => ({'data-music-title': String(attributes[MUSIC_TITLE_ATTR] ?? '')}),
            },
            [MUSIC_KIND_ATTR]: {
                default: null,
                parseHTML: element => element.getAttribute('data-music-kind'),
                renderHTML: attributes => {
                    const kind: unknown = attributes[MUSIC_KIND_ATTR];

                    return typeof kind === 'string' && kind.length > 0 ? {'data-music-kind': kind} : {};
                },
            },
            [MUSIC_DRAFT_ATTR]: {
                default: false,
                parseHTML: element => element.getAttribute('data-music-draft') === 'true',
                renderHTML: attributes => {
                    return attributes[MUSIC_DRAFT_ATTR] === true ? {'data-music-draft': 'true'} : {};
                },
            },
        };
    },

    parseHTML() {
        return [{tag: 'span[data-music-pill="start"]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['span', mergeAttributes(HTMLAttributes, {'data-music-pill': 'start'})];
    },

    addOptions() {
        return {locked: false};
    },

    addNodeView() {
        return ReactNodeViewRenderer(props => createElement(MusicStartPill, {
            ...props,
            locked: this.options.locked,
            numberLabel: this.options.numberLabel,
            onMusicAssigned: this.options.onMusicAssigned,
            onOpenMusicManager: this.options.onOpenMusicManager,
            onRequestCreateMusic: this.options.onRequestCreateMusic,
            persistentMusicRef: this.options.persistentMusicRef,
            onRequestRemoveMusic: this.options.onRequestRemoveMusic,
        }));
    },
});
