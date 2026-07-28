import type {DerivedMusic} from '@stagistic/script';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {buildMusicLabelMap} from './musicLabels';

const music = (over: Partial<DerivedMusic>): DerivedMusic => ({
    musicId: 'c1', sceneNumber: 1, indexInScene: 0, sceneMusicCount: 1, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: null, effectiveEndBlockId: 'b1', endKind: 'document-end', ...over,
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
});
