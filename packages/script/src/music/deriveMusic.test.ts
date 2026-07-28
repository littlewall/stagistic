import {
    describe, expect, it,
} from 'vite-plus/test';

import {deriveMusic, deriveMusicTimeline} from './deriveMusic';
import type {MusicBlockInput} from './types';

const sd = (blockId: string, musicAtoms: MusicBlockInput['musicAtoms']): MusicBlockInput => ({
    blockId, blockType: 'stageDirection', musicAtoms,
});
const scene = (blockId: string): MusicBlockInput => ({
    blockId, blockType: 'scene', musicAtoms: [],
});

describe('deriveMusic', () => {
    it('pairs an explicit out to its open start', () => {
        const music = deriveMusic([
            sd('b1', [
                {
                    role: 'start', musicId: 'c1', mode: 'open', title: 'Song', kind: null,
                },
            ]), sd('b2', [{role: 'out'}]),
        ]);

        expect(music).toEqual([
            {
                musicId: 'c1', sceneNumber: 0, indexInScene: 0, sceneMusicCount: 1, mode: 'open', title: 'Song', kind: null, startBlockId: 'b1', endBlockId: 'b2', effectiveEndBlockId: 'b2', endKind: 'explicit',
            },
        ]);
    });

    it('leaves an open music with null endBlockId when no out follows', () => {
        const music = deriveMusic([
            sd('b1', [
                {
                    role: 'start', musicId: 'c1', mode: 'open', title: 'Song', kind: null,
                },
            ]),
        ]);

        expect(music[0].endBlockId).toBeNull();
    });

    it('implicitly closes a prior open music when a new open start appears', () => {
        const music = deriveMusic([
            sd('b1', [
                {
                    role: 'start', musicId: 'c1', mode: 'open', title: 'A', kind: null,
                },
            ]), sd('b2', [
                {
                    role: 'start', musicId: 'c2', mode: 'open', title: 'B', kind: null,
                },
            ]),
        ]);

        expect(music.map(c => [c.musicId, c.endBlockId])).toEqual([['c1', null], ['c2', null]]);
    });

    it('clears the open music at a scene boundary (orphans a later out)', () => {
        const music = deriveMusic([
            sd('b1', [
                {
                    role: 'start', musicId: 'c1', mode: 'open', title: 'A', kind: null,
                },
            ]),
            scene('s2'),
            sd('b3', [{role: 'out'}]),
        ]);

        expect(music).toHaveLength(1);
        expect(music[0].endBlockId).toBeNull();
    });

    it('treats a hit as a zero-duration point that does not touch the open music', () => {
        const music = deriveMusic([
            sd('b1', [
                {
                    role: 'start', musicId: 'c1', mode: 'open', title: 'Song', kind: null,
                },
            ]),
            sd('b2', [
                {
                    role: 'start', musicId: 'h1', mode: 'hit', title: 'Sting', kind: null,
                },
            ]),
            sd('b3', [{role: 'out'}]),
        ]);

        expect(music).toEqual([
            {
                musicId: 'c1', sceneNumber: 0, indexInScene: 0, sceneMusicCount: 2, mode: 'open', title: 'Song', kind: null, startBlockId: 'b1', endBlockId: 'b3', effectiveEndBlockId: 'b3', endKind: 'explicit',
            }, {
                musicId: 'h1', sceneNumber: 0, indexInScene: 1, sceneMusicCount: 2, mode: 'hit', title: 'Sting', kind: null, startBlockId: 'b2', endBlockId: 'b2', effectiveEndBlockId: 'b2', endKind: 'hit',
            },
        ]);
    });

    it('numbers music per scene: one start gets index 0 / count 1', () => {
        const music = deriveMusic([
            scene('s1'), sd('b1', [
                {
                    role: 'start', musicId: 'c1', mode: 'open', title: 'A', kind: null,
                },
            ]),
        ]);

        expect(music[0]).toMatchObject({
            sceneNumber: 1, indexInScene: 0, sceneMusicCount: 1,
        });
    });

    it('numbers two music in the same scene as 0/1 with count 2', () => {
        const music = deriveMusic([
            scene('s1'),
            sd('b1', [
                {
                    role: 'start', musicId: 'c1', mode: 'open', title: 'A', kind: null,
                },
            ]),
            sd('b2', [{role: 'out'}]),
            sd('b3', [
                {
                    role: 'start', musicId: 'c2', mode: 'open', title: 'B', kind: null,
                },
            ]),
        ]);

        expect(music.map(c => [
            c.sceneNumber,
            c.indexInScene,
            c.sceneMusicCount,
        ]))
            .toEqual([
                [
                    1,
                    0,
                    2,
                ], [
                    1,
                    1,
                    2,
                ],
            ]);
    });

    it('increments the scene number across scenes and counts a hit', () => {
        const music = deriveMusic([
            scene('s1'),
            sd('b1', [
                {
                    role: 'start', musicId: 'c1', mode: 'open', title: 'A', kind: null,
                },
            ]),
            scene('s2'),
            sd('b2', [
                {
                    role: 'start', musicId: 'h1', mode: 'hit', title: 'Sting', kind: null,
                },
            ]),
        ]);

        expect(music.map(c => [
            c.musicId,
            c.sceneNumber,
            c.indexInScene,
            c.sceneMusicCount,
        ]))
            .toEqual([
                [
                    'c1',
                    1,
                    0,
                    1,
                ], [
                    'h1',
                    2,
                    0,
                    1,
                ],
            ]);
    });
});

describe('deriveMusicTimeline', () => {
    it('derives explicit, next-music, scene-end, document-end, and hit ends', () => {
        const timeline = deriveMusicTimeline([
            scene('s1'),
            sd('a1', [
                {
                    role: 'start', musicId: 'a', mode: 'open', title: 'A', kind: null,
                },
            ]),
            sd('a2', [{role: 'out'}]),
            sd('b1', [
                {
                    role: 'start', musicId: 'b', mode: 'open', title: 'B', kind: null,
                },
            ]),
            sd('h1', [
                {
                    role: 'start', musicId: 'hit', mode: 'hit', title: 'Hit', kind: null,
                },
            ]),
            sd('c1', [
                {
                    role: 'start', musicId: 'c', mode: 'open', title: 'C', kind: null,
                },
            ]),
            sd('c2', []),
            scene('s2'),
            sd('d1', [
                {
                    role: 'start', musicId: 'd', mode: 'open', title: 'D', kind: null,
                },
            ]),
            sd('d2', []),
        ]);

        expect(timeline.music.map(music => ({
            id: music.musicId,
            explicit: music.endBlockId,
            effective: music.effectiveEndBlockId,
            kind: music.endKind,
        }))).toEqual([
            {
                id: 'a', explicit: 'a2', effective: 'a2', kind: 'explicit',
            },
            {
                id: 'b', explicit: null, effective: 'c1', kind: 'next-music',
            },
            {
                id: 'hit', explicit: 'h1', effective: 'h1', kind: 'hit',
            },
            {
                id: 'c', explicit: null, effective: 'c2', kind: 'scene-end',
            },
            {
                id: 'd', explicit: null, effective: 'd2', kind: 'document-end',
            },
        ]);
    });

    it('evaluates an out before a start on the same block', () => {
        const timeline = deriveMusicTimeline([
            sd('b1', [
                {
                    role: 'start', musicId: 'a', mode: 'open', title: 'A', kind: null,
                },
            ]),
            sd('b2', [
                {role: 'out'}, {
                    role: 'start', musicId: 'b', mode: 'open', title: 'B', kind: null,
                },
            ]),
            sd('b3', []),
        ]);

        expect(timeline.music[0]).toMatchObject({
            musicId: 'a', endBlockId: 'b2', effectiveEndBlockId: 'b2', endKind: 'explicit',
        });
        expect(timeline.music[1]).toMatchObject({
            musicId: 'b', endBlockId: null, effectiveEndBlockId: 'b3', endKind: 'document-end',
        });
    });

    it('keeps hits inside an open interval and reports orphan outs', () => {
        const timeline = deriveMusicTimeline([
            sd('orphan', [{role: 'out'}]),
            sd('b1', [
                {
                    role: 'start', musicId: 'a', mode: 'open', title: 'A', kind: null,
                },
            ]),
            sd('h1', [
                {
                    role: 'start', musicId: 'hit', mode: 'hit', title: 'Hit', kind: null,
                },
            ]),
            sd('b2', [{role: 'out'}]),
            sd('orphan-2', [{role: 'out'}]),
        ]);

        expect(timeline.music[0]).toMatchObject({
            musicId: 'a', endBlockId: 'b2', effectiveEndBlockId: 'b2', endKind: 'explicit',
        });
        expect(timeline.music[1]).toMatchObject({
            musicId: 'hit', effectiveEndBlockId: 'h1', endKind: 'hit',
        });
        expect(timeline.orphanOutBlockIds).toEqual(['orphan', 'orphan-2']);
    });

    it('ends an open song before an act boundary', () => {
        const timeline = deriveMusicTimeline([
            sd('b1', [
                {
                    role: 'start', musicId: 'a', mode: 'open', title: 'A', kind: null,
                },
            ]),
            sd('b2', []),
            {
                blockId: 'act-2', blockType: 'act', musicAtoms: [],
            },
            sd('b3', []),
        ]);

        expect(timeline.music[0]).toMatchObject({
            effectiveEndBlockId: 'b2', endKind: 'scene-end',
        });
    });
});
