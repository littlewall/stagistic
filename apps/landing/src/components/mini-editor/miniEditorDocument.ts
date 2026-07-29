import {
    MUSIC_ID_ATTR,
    MUSIC_MODE_ATTR,
    MUSIC_START_NODE_NAME,
    MUSIC_TITLE_ATTR,
    type ScriptDocument,
} from '@stagistic/script';

export const miniEditorDocument: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'scene',
            attrs: {id: 'landing-mini-scene'},
            content: [{type: 'text', text: 'INSIDE THE LIGHTHOUSE'}],
        }, {
            type: 'stageDirection',
            attrs: {id: 'landing-mini-stage-direction-opening'},
            content: [{
                type: 'text',
                text: 'An old lamp stands beneath the great lens.',
            }],
        }, {
            type: 'character',
            attrs: {
                id: 'landing-mini-character-eli-1',
                characterRefs: {ELI: 'mini-character:ELI'},
            },
            content: [{type: 'text', text: 'ELI'}],
        }, {
            type: 'dialogue',
            attrs: {id: 'landing-mini-dialogue-eli-1'},
            content: [{type: 'text', text: 'No oil. No flame.'}],
        }, {
            type: 'character',
            attrs: {
                id: 'landing-mini-character-mara-1',
                characterRefs: {MARA: 'mini-character:MARA'},
            },
            content: [{type: 'text', text: 'MARA'}],
        }, {
            type: 'dialogue',
            attrs: {id: 'landing-mini-dialogue-mara-1'},
            content: [{
                type: 'text',
                text: 'My father said this lamp once answered a song.',
            }],
        }, {
            type: 'character',
            attrs: {
                id: 'landing-mini-character-eli-2',
                characterRefs: {ELI: 'mini-character:ELI'},
            },
            content: [{type: 'text', text: 'ELI'}],
        }, {
            type: 'aside',
            attrs: {id: 'landing-mini-aside-eli'},
            content: [{type: 'text', text: 'skeptically'}],
        }, {
            type: 'dialogue',
            attrs: {id: 'landing-mini-dialogue-eli-2'},
            content: [{type: 'text', text: 'Of course it did.'}],
        }, {
            type: 'character',
            attrs: {
                id: 'landing-mini-character-mara-2',
                characterRefs: {MARA: 'mini-character:MARA'},
            },
            content: [{type: 'text', text: 'MARA'}],
        }, {
            type: 'dialogue',
            attrs: {id: 'landing-mini-dialogue-mara-2'},
            content: [{
                type: 'text',
                text: 'Tonight, we need to believe him.',
            }],
        }, {
            type: 'stageDirection',
            attrs: {id: 'landing-mini-stage-direction-music'},
            content: [{
                type: 'text',
                text: 'Music starts to play.',
            }, {
                type: MUSIC_START_NODE_NAME,
                attrs: {
                    [MUSIC_ID_ATTR]: 'landing-mini-music',
                    [MUSIC_MODE_ATTR]: 'open',
                    [MUSIC_TITLE_ATTR]: 'One Small Light',
                },
            }],
        },
    ],
};
