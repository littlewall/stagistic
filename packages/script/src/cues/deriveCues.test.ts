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
                cueId: 'c1', number: 1, mode: 'open', title: 'Song', kind: null, startBlockId: 'b1', endBlockId: 'b2',
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
                cueId: 'c1', number: 1, mode: 'open', title: 'Song', kind: null, startBlockId: 'b1', endBlockId: 'b3',
            }, {
                cueId: 'h1', number: 2, mode: 'hit', title: 'Sting', kind: null, startBlockId: 'b2', endBlockId: 'b2',
            },
        ]);
    });
});
