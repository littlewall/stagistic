import type {SceneBoardModel} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {buildFilterCharacters} from './buildFilterCharacters';

const entry = (id: string | null, key: string) => ({
    entryId: id ?? `key:${key}`,
    characterId: id,
    key,
    level: 'present' as const,
});

const model: SceneBoardModel = {
    acts: [
        {
            actBlockId: null,
            name: 'ACT 1',
            scenes: [
                {
                    headingBlockId: 's1',
                    number: 1,
                    title: 'One',
                    actBlockId: null,
                    characters: [
                        entry('c-ben', 'BEN'),
                        entry(null, 'DOCTOR'),
                        entry('c-anna', 'ANNA'),
                    ],
                },
                {
                    headingBlockId: 's2',
                    number: 2,
                    title: 'Two',
                    actBlockId: null,
                    characters: [entry('c-anna', 'ANNA')],
                },
            ],
        },
    ],
};

const characters = [
    {
        id: 'c-zed',
        key: 'ZED',
        colorHex: null,
    },
    {
        id: 'c-anna',
        key: 'ANNA',
        colorHex: '#cc3344',
    },
    {
        id: 'c-ben',
        key: 'BEN',
        colorHex: null,
    },
    {
        id: 'c-cy',
        key: 'CY',
        colorHex: null,
    },
];

describe('buildFilterCharacters', () => {
    it('lists confirmed characters by first appearance, with scene counts and colors', () => {
        const result = buildFilterCharacters(model, characters, new Map([['BEN', '#2266cc']])).slice(0, 2);

        expect(result).toEqual([
            {
                id: 'c-ben',
                name: 'BEN',
                color: '#2266cc',
                sceneCount: 1,
            },
            {
                id: 'c-anna',
                name: 'ANNA',
                color: '#cc3344',
                sceneCount: 2,
            },
        ]);
    });

    it('puts characters without scenes last, alphabetically, and leaves out unconfirmed keys', () => {
        const result = buildFilterCharacters(model, characters, new Map());

        expect(result.map(character => [character.name, character.sceneCount])).toEqual([
            ['BEN', 1],
            ['ANNA', 2],
            ['CY', 0],
            ['ZED', 0],
        ]);
    });
});
