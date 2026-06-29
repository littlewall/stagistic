import {
    describe, expect, it,
} from 'vite-plus/test';

import {deriveCues} from './deriveCues';
import type {CueBlockInput} from './types';

const sd = (blockId: string, cueAtoms: CueBlockInput['cueAtoms']): CueBlockInput => ({
    blockId, blockType: 'stageDirection', cueAtoms,
});
const scene = (blockId: string): CueBlockInput => ({
    blockId, blockType: 'scene', cueAtoms: [],
});

describe('deriveCues', () => {
    it('pairs an explicit out to its open start', () => {
        const cues = deriveCues([
            sd('b1', [
                {
                    role: 'start', cueId: 'c1', mode: 'open', title: 'Song', kind: null,
                },
            ]), sd('b2', [{role: 'out'}]),
        ]);

        expect(cues).toEqual([
            {
                cueId: 'c1', sceneNumber: 0, indexInScene: 0, sceneCueCount: 1, mode: 'open', title: 'Song', kind: null, startBlockId: 'b1', endBlockId: 'b2',
            },
        ]);
    });

    it('leaves an open cue with null endBlockId when no out follows', () => {
        const cues = deriveCues([
            sd('b1', [
                {
                    role: 'start', cueId: 'c1', mode: 'open', title: 'Song', kind: null,
                },
            ]),
        ]);

        expect(cues[0].endBlockId).toBeNull();
    });

    it('implicitly closes a prior open cue when a new open start appears', () => {
        const cues = deriveCues([
            sd('b1', [
                {
                    role: 'start', cueId: 'c1', mode: 'open', title: 'A', kind: null,
                },
            ]), sd('b2', [
                {
                    role: 'start', cueId: 'c2', mode: 'open', title: 'B', kind: null,
                },
            ]),
        ]);

        expect(cues.map(c => [c.cueId, c.endBlockId])).toEqual([['c1', null], ['c2', null]]);
    });

    it('clears the open cue at a scene boundary (orphans a later out)', () => {
        const cues = deriveCues([
            sd('b1', [
                {
                    role: 'start', cueId: 'c1', mode: 'open', title: 'A', kind: null,
                },
            ]),
            scene('s2'),
            sd('b3', [{role: 'out'}]),
        ]);

        expect(cues).toHaveLength(1);
        expect(cues[0].endBlockId).toBeNull();
    });

    it('treats a hit as a zero-duration point that does not touch the open cue', () => {
        const cues = deriveCues([
            sd('b1', [
                {
                    role: 'start', cueId: 'c1', mode: 'open', title: 'Song', kind: null,
                },
            ]),
            sd('b2', [
                {
                    role: 'start', cueId: 'h1', mode: 'hit', title: 'Sting', kind: null,
                },
            ]),
            sd('b3', [{role: 'out'}]),
        ]);

        expect(cues).toEqual([
            {
                cueId: 'c1', sceneNumber: 0, indexInScene: 0, sceneCueCount: 2, mode: 'open', title: 'Song', kind: null, startBlockId: 'b1', endBlockId: 'b3',
            }, {
                cueId: 'h1', sceneNumber: 0, indexInScene: 1, sceneCueCount: 2, mode: 'hit', title: 'Sting', kind: null, startBlockId: 'b2', endBlockId: 'b2',
            },
        ]);
    });

    it('numbers cues per scene: one start gets index 0 / count 1', () => {
        const cues = deriveCues([
            scene('s1'), sd('b1', [
                {
                    role: 'start', cueId: 'c1', mode: 'open', title: 'A', kind: null,
                },
            ]),
        ]);

        expect(cues[0]).toMatchObject({
            sceneNumber: 1, indexInScene: 0, sceneCueCount: 1,
        });
    });

    it('numbers two cues in the same scene as 0/1 with count 2', () => {
        const cues = deriveCues([
            scene('s1'),
            sd('b1', [
                {
                    role: 'start', cueId: 'c1', mode: 'open', title: 'A', kind: null,
                },
            ]),
            sd('b2', [{role: 'out'}]),
            sd('b3', [
                {
                    role: 'start', cueId: 'c2', mode: 'open', title: 'B', kind: null,
                },
            ]),
        ]);

        expect(cues.map(c => [
            c.sceneNumber,
            c.indexInScene,
            c.sceneCueCount,
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
        const cues = deriveCues([
            scene('s1'),
            sd('b1', [
                {
                    role: 'start', cueId: 'c1', mode: 'open', title: 'A', kind: null,
                },
            ]),
            scene('s2'),
            sd('b2', [
                {
                    role: 'start', cueId: 'h1', mode: 'hit', title: 'Sting', kind: null,
                },
            ]),
        ]);

        expect(cues.map(c => [
            c.cueId,
            c.sceneNumber,
            c.indexInScene,
            c.sceneCueCount,
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
