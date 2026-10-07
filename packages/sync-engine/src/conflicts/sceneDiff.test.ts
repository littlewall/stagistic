import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    block,
    buildLongScript,
    doc,
} from '../testing/fixtures';
import {countDifferingScenes} from './sceneDiff';

describe('countDifferingScenes', () => {
    it('is zero for identical documents', () => {
        expect(countDifferingScenes(buildLongScript(5, 3), buildLongScript(5, 3))).toBe(0);
    });

    it('counts changed, added and removed scenes by heading blockId', () => {
        const left = doc(
            block('act', 'a', 'ACT ONE'),
            block('scene', 's1', 'ONE'),
            block('dialogue', 'd1', 'same'),
            block('scene', 's2', 'TWO'),
            block('dialogue', 'd2', 'before'),
            block('scene', 's3', 'THREE'),
        );
        const right = doc(
            block('act', 'a', 'ACT ONE'),
            block('scene', 's1', 'ONE'),
            block('dialogue', 'd1', 'same'),
            block('scene', 's2', 'TWO'),
            block('dialogue', 'd2', 'after'),
            block('scene', 's4', 'FOUR'),
        );

        // s2 changed, s3 removed, s4 added
        expect(countDifferingScenes(left, right)).toBe(3);
    });

    it('counts a preamble change as one scene', () => {
        expect(countDifferingScenes(
            doc(block('act', 'a', 'ACT ONE'), block('scene', 's1')),
            doc(block('act', 'a', 'ACT I'), block('scene', 's1')),
        )).toBe(1);
    });
});
