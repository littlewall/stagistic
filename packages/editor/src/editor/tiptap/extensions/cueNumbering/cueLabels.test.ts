import type {DerivedCue} from '@stagistic/script';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {buildCueLabelMap} from './cueLabels';

const cue = (over: Partial<DerivedCue>): DerivedCue => ({
    cueId: 'c1', sceneNumber: 1, indexInScene: 0, sceneCueCount: 1, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: null, ...over,
});

describe('buildCueLabelMap', () => {
    it('maps a cue start id to its formatted number', () => {
        const {byCueId} = buildCueLabelMap([
            cue({
                sceneNumber: 3, sceneCueCount: 2, indexInScene: 1,
            }),
        ]);

        expect(byCueId.get('c1')).toBe('3.B');
    });

    it('maps an explicit out (by its block) to the out label', () => {
        const {outByEndBlockId} = buildCueLabelMap([
            cue({
                title: 'Night', endBlockId: 'b2', sceneNumber: 3,
            }),
        ]);

        expect(outByEndBlockId.get('b2')).toBe('3. out (Night)');
    });

    it('does not map a hit as an out', () => {
        const {outByEndBlockId} = buildCueLabelMap([cue({mode: 'hit', endBlockId: 'b1'})]);

        expect(outByEndBlockId.size).toBe(0);
    });
});
