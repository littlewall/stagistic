import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {collectInitialPageData} from './collectInitialPageData';

const snapshot = {
    blocks: [
        {
            blockId: 'scene-1',
            orderNo: 0,
            blockType: 'scene',
            textContent: 'First',
            actBlockId: null,
            sceneBlockId: 'scene-1',
            characterRefs: null,
        },
        {
            blockId: 'cue-b',
            orderNo: 1,
            blockType: 'character',
            textContent: 'BOB',
            actBlockId: null,
            sceneBlockId: 'scene-1',
            characterRefs: [{key: 'BOB', characterId: 'char-b'}],
        },
        {
            blockId: 'unconfirmed',
            orderNo: 2,
            blockType: 'character',
            textContent: 'GHOST',
            actBlockId: null,
            sceneBlockId: 'scene-1',
            characterRefs: [{key: 'GHOST', characterId: null}],
        },
        {
            blockId: 'scene-2',
            orderNo: 3,
            blockType: 'scene',
            textContent: 'Second',
            actBlockId: null,
            sceneBlockId: 'scene-2',
            characterRefs: null,
        },
        {
            blockId: 'cue-a',
            orderNo: 4,
            blockType: 'character',
            textContent: 'ANNA',
            actBlockId: null,
            sceneBlockId: 'scene-2',
            characterRefs: [{key: 'ANNA', characterId: 'char-a'}],
        },
    ],
    music: [],
    orphanMusicOutBlockIds: [],
};

const confirmedCharacters = [
    {
        id: 'char-a', kind: 'character' as const, key: 'ANNA', outline: '  Lead  ',
    },
    {
        id: 'char-b', kind: 'character' as const, key: 'BOB', outline: ' ',
    },
    {
        id: 'char-z', kind: 'character' as const, key: 'ZORA', outline: null,
    },
    {
        id: 'group-all', kind: 'group' as const, key: 'ALL', memberIds: ['char-a'],
    },
];

const places = [
    {id: 'place-a', name: 'Attic'},
    {id: 'place-b', name: 'Ballroom'},
    {id: 'place-c', name: 'Cellar'},
    {id: 'unused', name: 'Unused'},
];

describe('collectInitialPageData', () => {
    it('collects exact-kind characters with outlines and first appearances', () => {
        const result = collectInitialPageData(
            snapshot,
            confirmedCharacters,
            places,
            {},
        );

        expect(result.initialCharacters).toEqual([
            {
                id: 'char-a',
                displayName: 'Anna',
                outline: 'Lead',
                firstAppearanceOrder: 4,
            },
            {
                id: 'char-b',
                displayName: 'Bob',
                outline: null,
                firstAppearanceOrder: 1,
            },
            {
                id: 'char-z',
                displayName: 'Zora',
                outline: null,
                firstAppearanceOrder: null,
            },
        ]);
    });

    it('deduplicates used places and orders them by first scene', () => {
        const result = collectInitialPageData(
            snapshot,
            confirmedCharacters,
            places,
            {
                'scene-1': ['place-c', 'place-b'],
                'scene-2': ['place-a', 'place-c'],
            },
        );

        expect(result.initialPlaces).toEqual([
            {
                id: 'place-b',
                name: 'Ballroom',
                firstAppearanceOrder: 0,
            },
            {
                id: 'place-c',
                name: 'Cellar',
                firstAppearanceOrder: 0,
            },
            {
                id: 'place-a',
                name: 'Attic',
                firstAppearanceOrder: 3,
            },
        ]);
    });
});
