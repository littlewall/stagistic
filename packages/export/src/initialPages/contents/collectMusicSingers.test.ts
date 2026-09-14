import type {
    DerivedMusic,
    IndexedScriptBlock,
} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {collectMusicSingers} from './collectMusicSingers';

const block = (
    blockId: string,
    blockType: string,
    keys: string[] = [],
): IndexedScriptBlock => ({
    blockId,
    orderNo: 0,
    blockType,
    textContent: '',
    actBlockId: null,
    sceneBlockId: null,
    characterRefs: keys.length > 0
        ? keys.map(key => ({key, characterId: null}))
        : null,
});

const music = (
    startBlockId: string,
    effectiveEndBlockId: string,
    kind: string | null = 'song',
): DerivedMusic => ({
    musicId: 'm1',
    sceneNumber: 1,
    indexInScene: 0,
    sceneMusicCount: 1,
    mode: 'open',
    title: 'Song',
    kind,
    startBlockId,
    endBlockId: effectiveEndBlockId,
    effectiveEndBlockId,
    endKind: 'explicit',
});

const characters = [
    {
        id: 'c-kylie', key: 'KYLIE', displayName: 'Kylie',
    },
    {
        id: 'c-shane', key: 'SHANE', displayName: 'Shane',
    },
    {
        id: 'c-whit', key: 'WHIT', displayName: 'Whit',
    },
];

describe('collectMusicSingers', () => {
    it('orders singers by lyrics-block count, descending', () => {
        const blocks = [
            block('start', 'stageDirection'),
            block('cue1', 'character', ['SHANE']),
            block('l1', 'lyrics'),
            block('cue2', 'character', ['KYLIE']),
            block('l2', 'lyrics'),
            block('l3', 'lyrics'),
            block('end', 'stageDirection'),
        ];

        expect(collectMusicSingers(music('start', 'end'), {
            blocks, characters, groups: [],
        })).toEqual(['Kylie', 'Shane']);
    });

    it('credits every name in a multi-name cue', () => {
        const blocks = [
            block('start', 'stageDirection'),
            block('cue1', 'character', ['KYLIE', 'SHANE']),
            block('l1', 'lyrics'),
            block('end', 'stageDirection'),
        ];

        expect(collectMusicSingers(music('start', 'end'), {
            blocks, characters, groups: [],
        })).toEqual(['Kylie', 'Shane']);
    });

    it('stops a cue from carrying across a scene boundary', () => {
        const blocks = [
            block('start', 'stageDirection'),
            block('cue1', 'character', ['KYLIE']),
            block('scene1', 'scene'),
            block('l1', 'lyrics'),
            block('end', 'stageDirection'),
        ];

        expect(collectMusicSingers(music('start', 'end'), {
            blocks, characters, groups: [],
        })).toEqual([]);
    });

    it('includes singers that are not in the confirmed catalog', () => {
        const blocks = [
            block('start', 'stageDirection'),
            block('cue1', 'character', ['JEROD']),
            block('l1', 'lyrics'),
            block('end', 'stageDirection'),
        ];

        expect(collectMusicSingers(music('start', 'end'), {
            blocks, characters, groups: [],
        })).toEqual(['Jerod']);
    });

    it('drops a group whose every member already sings individually', () => {
        const blocks = [
            block('start', 'stageDirection'),
            block('cue1', 'character', ['KYLIE']),
            block('l1', 'lyrics'),
            block('cue2', 'character', ['SHANE']),
            block('l2', 'lyrics'),
            block('cue3', 'character', ['EVERYONE']),
            block('l3', 'lyrics'),
            block('end', 'stageDirection'),
        ];

        expect(collectMusicSingers(music('start', 'end'), {
            blocks,
            characters,
            groups: [
                {
                    id: 'g1', key: 'EVERYONE', memberIds: ['c-kylie', 'c-shane'],
                },
            ],
        })).toEqual(['Kylie', 'Shane']);
    });

    it('keeps a group when only some members sing individually', () => {
        const blocks = [
            block('start', 'stageDirection'),
            block('cue1', 'character', ['KYLIE']),
            block('l1', 'lyrics'),
            block('cue2', 'character', ['EVERYONE']),
            block('l2', 'lyrics'),
            block('end', 'stageDirection'),
        ];

        expect(collectMusicSingers(music('start', 'end'), {
            blocks,
            characters,
            groups: [
                {
                    id: 'g1', key: 'EVERYONE', memberIds: ['c-kylie', 'c-whit'],
                },
            ],
        })).toEqual(['Kylie', 'Everyone']);
    });

    it('keeps a group that has no members', () => {
        const blocks = [
            block('start', 'stageDirection'),
            block('cue1', 'character', ['EVERYONE']),
            block('l1', 'lyrics'),
            block('end', 'stageDirection'),
        ];

        expect(collectMusicSingers(music('start', 'end'), {
            blocks,
            characters,
            groups: [
                {
                    id: 'g1', key: 'EVERYONE', memberIds: [],
                },
            ],
        })).toEqual(['Everyone']);
    });

    it('ignores lyrics outside the music range', () => {
        const blocks = [
            block('before', 'character', ['WHIT']),
            block('beforeLyrics', 'lyrics'),
            block('start', 'stageDirection'),
            block('cue1', 'character', ['KYLIE']),
            block('l1', 'lyrics'),
            block('end', 'stageDirection'),
            block('after', 'lyrics'),
        ];

        expect(collectMusicSingers(music('start', 'end'), {
            blocks, characters, groups: [],
        })).toEqual(['Kylie']);
    });

    it('returns nothing when the range cannot be resolved', () => {
        expect(collectMusicSingers(music('missing', 'end'), {
            blocks: [block('end', 'stageDirection')], characters, groups: [],
        })).toEqual([]);
    });
});
