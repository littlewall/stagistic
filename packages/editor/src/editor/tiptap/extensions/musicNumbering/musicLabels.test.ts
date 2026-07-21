import type {DerivedMusic} from '@stagistic/script';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {buildMusicLabelMap} from './musicLabels';

const music = (over: Partial<DerivedMusic>): DerivedMusic => ({
    musicId: 'c1', sceneNumber: 1, indexInScene: 0, sceneMusicCount: 1, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: null, ...over,
});

describe('buildMusicLabelMap', () => {
    it('maps a music start id to its formatted number', () => {
        const {byMusicId} = buildMusicLabelMap([
            music({
                sceneNumber: 3, sceneMusicCount: 2, indexInScene: 1,
            }),
        ]);

        expect(byMusicId.get('c1')).toBe('3.B)');
    });

    it('maps an explicit out (by its block) to the out label', () => {
        const {outByEndBlockId} = buildMusicLabelMap([
            music({
                title: 'Night', endBlockId: 'b2', sceneNumber: 3,
            }),
        ]);

        expect(outByEndBlockId.get('b2')).toBe('3) out (Night)');
    });

    it('does not map a hit as an out', () => {
        const {outByEndBlockId} = buildMusicLabelMap([music({mode: 'hit', endBlockId: 'b1'})]);

        expect(outByEndBlockId.size).toBe(0);
    });
});
