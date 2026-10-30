import {block} from './testUtils';

export const numberedScript = {
    doc: {
        type: 'doc' as const,
        content: [
            block('act', 'act', 'Act I'),
            block('scene', 'scene1', 'First'),
            {
                ...block('stageDirection', 'cue', ''),
                content: [
                    {
                        type: 'musicStart',
                        attrs: {
                            musicId: 'song',
                            title: 'Song',
                            mode: 'open',
                        },
                    },
                ],
            },
            block('lyrics', 'lyrics', 'First line'),
            {...block('stageDirection', 'out', ''), content: [{type: 'musicOut'}]},
            block('scene', 'scene2', 'Second'),
            block('dialogue', 'dialogue', 'Hello'),
        ],
    },
    titlePage: null,
    scriptTitle: 'Numbering proof',
    characters: [],
    groups: [],
    initialCharacters: [],
    initialPlaces: [],
    initialVocalRanges: [],
};
