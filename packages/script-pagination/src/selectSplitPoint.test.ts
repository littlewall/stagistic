import {
    describe, expect, it,
} from 'vite-plus/test';

import {selectSplitPoint} from './selectSplitPoint';
import type {BlockLine} from './types';

const lines = (count: number, height: number): BlockLine[] => Array.from({length: count}, (_unused, index) => ({startPos: index, topRel: index * height}));

describe('selectSplitPoint', () => {
    it('splits at the deepest line that still fits with ≥2 lines each side', () => {
        const decision = selectSplitPoint({
            lines: lines(6, 10),
            consumedHeight: 0,
            spaceLeft: 35,
            minLinesBefore: 2,
            minLinesAfter: 2,
            epsilonPx: 1,
            canPushDown: false,
        });

        expect(decision).toEqual({
            kind: 'split', breakPos: 3, fragmentHeight: 30,
        });
    });

    it('pushes the whole block down when it cannot keep 2 lines before the break', () => {
        const decision = selectSplitPoint({
            lines: lines(6, 10),
            consumedHeight: 0,
            spaceLeft: 15,
            minLinesBefore: 2,
            minLinesAfter: 2,
            epsilonPx: 1,
            canPushDown: true,
        });

        expect(decision).toEqual({kind: 'pushDown'});
    });

    it('force-places when nothing fits and it cannot push down', () => {
        const decision = selectSplitPoint({
            lines: lines(2, 10),
            consumedHeight: 0,
            spaceLeft: 5,
            minLinesBefore: 2,
            minLinesAfter: 2,
            epsilonPx: 1,
            canPushDown: false,
        });

        expect(decision).toEqual({kind: 'forcePlace'});
    });
});
