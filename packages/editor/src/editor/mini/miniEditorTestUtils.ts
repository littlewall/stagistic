import {
    MUSIC_ID_ATTR,
    MUSIC_MODE_ATTR,
    MUSIC_START_NODE_NAME,
    MUSIC_TITLE_ATTR,
    type ScriptDocument,
} from '@stagistic/script';
import {Editor} from '@tiptap/core';
import HardBreak from '@tiptap/extension-hard-break';
import Text from '@tiptap/extension-text';

import {DocumentWithSettings} from '../tiptap/extensions/DocumentExtension';
import {
    MusicStartNode,
    ScriptBlockNodes,
} from '../tiptap/nodes';
import {
    MiniEditorGuardExtension,
    type MiniEditorStructureSignature,
} from './MiniEditorGuardExtension';

export const createMiniEditorTestDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'scene',
            attrs: {id: 'mini-scene'},
            content: [{type: 'text', text: 'Inside the lighthouse'}],
        },
        {
            type: 'stageDirection',
            attrs: {id: 'mini-stage-direction'},
            content: [
                {type: 'text', text: 'Music starts. '}, {
                    type: MUSIC_START_NODE_NAME,
                    attrs: {
                        [MUSIC_ID_ATTR]: 'mini-music',
                        [MUSIC_MODE_ATTR]: 'open',
                        [MUSIC_TITLE_ATTR]: 'One Small Light',
                    },
                },
            ],
        },
        {
            type: 'character',
            attrs: {
                id: 'mini-character',
                characterRefs: {
                    MARA: 'mini-character:MARA',
                    ELI: 'mini-character:ELI',
                },
            },
            content: [{type: 'text', text: 'MARA / ELI'}],
        },
        {
            type: 'aside',
            attrs: {id: 'mini-aside'},
            content: [{type: 'text', text: 'together'}],
        },
        {
            type: 'dialogue',
            attrs: {id: 'mini-dialogue'},
            content: [{type: 'text', text: 'One small light'}],
        },
    ],
});

export const miniEditorStructureSignature: MiniEditorStructureSignature = {
    blocks: [
        {id: 'mini-scene', type: 'scene'},
        {id: 'mini-stage-direction', type: 'stageDirection'},
        {id: 'mini-character', type: 'character'},
        {id: 'mini-aside', type: 'aside'},
        {id: 'mini-dialogue', type: 'dialogue'},
    ],
    music: {
        blockId: 'mini-stage-direction',
        musicId: 'mini-music',
    },
};

const baseExtensions = [
    DocumentWithSettings,
    Text,
    HardBreak,
    ...ScriptBlockNodes,
    MusicStartNode,
];

export const createMiniEditorTestEditor = () => new Editor({
    content: createMiniEditorTestDocument(),
    extensions: baseExtensions,
});

export const createGuardedMiniEditorTestEditor = () => new Editor({
    content: createMiniEditorTestDocument(),
    extensions: [
        ...baseExtensions, MiniEditorGuardExtension.configure({
            signature: miniEditorStructureSignature,
        }),
    ],
});

export const findMiniEditorTestBlockPosition = (
    editor: Editor,
    blockId: string,
): number => {
    let result = -1;

    editor.state.doc.descendants((node, pos) => {
        if (node.attrs.id === blockId) {
            result = pos;

            return false;
        }

        return result < 0;
    });

    if (result < 0) {
        throw new Error(`Block ${blockId} was not found.`);
    }

    return result;
};
