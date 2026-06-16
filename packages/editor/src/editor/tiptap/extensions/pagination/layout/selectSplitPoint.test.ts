import {
    describe, expect, it,
} from 'vite-plus/test';

import {type BlockLine} from '../types';
import {selectSplitPoint} from './selectSplitPoint';

const LINE_HEIGHT = 22;

const uniformLines = (count: number, paddingTop = 0): BlockLine[] => Array.from({length: count}, (_, index) => ({
    startPos: 100 + index * 10,
    topRel: paddingTop + index * LINE_HEIGHT,
}));
const baseArgs = {
    consumedHeight: 0,
    minLinesBefore: 2,
    minLinesAfter: 2,
    epsilonPx: 1,
    canPushDown: true,
};

describe('selectSplitPoint', () => {
    it('splits at the last line boundary that fits', () => {
        const decision = selectSplitPoint({
            ...baseArgs,
            lines: uniformLines(10),
            spaceLeft: 5 * LINE_HEIGHT,
        });

        expect(decision).toEqual({
            kind: 'split',
            breakPos: 150,
            fragmentHeight: 5 * LINE_HEIGHT,
        });
    });

    it('tolerates sub-pixel noise on an exact line fit', () => {
        const decision = selectSplitPoint({
            ...baseArgs,
            lines: uniformLines(10),
            spaceLeft: 5 * LINE_HEIGHT - 0.5,
        });

        expect(decision).toEqual({
            kind: 'split',
            breakPos: 150,
            fragmentHeight: 5 * LINE_HEIGHT,
        });
    });

    it('pushes the block down when fewer than minLinesBefore fit', () => {
        const decision = selectSplitPoint({
            ...baseArgs,
            lines: uniformLines(10),
            spaceLeft: LINE_HEIGHT,
        });

        expect(decision).toEqual({kind: 'pushDown'});
    });

    it('moves the split earlier so minLinesAfter lines carry over', () => {
        const decision = selectSplitPoint({
            ...baseArgs,
            lines: uniformLines(10),
            spaceLeft: 9 * LINE_HEIGHT,
        });

        expect(decision).toEqual({
            kind: 'split',
            breakPos: 180,
            fragmentHeight: 8 * LINE_HEIGHT,
        });
    });

    it('never splits a block of three lines or fewer', () => {
        const decision = selectSplitPoint({
            ...baseArgs,
            lines: uniformLines(3),
            spaceLeft: 2 * LINE_HEIGHT,
        });

        expect(decision).toEqual({kind: 'pushDown'});
    });

    it('splits a continuation relative to the height already consumed', () => {
        const decision = selectSplitPoint({
            ...baseArgs,
            lines: uniformLines(10),
            consumedHeight: 5 * LINE_HEIGHT,
            spaceLeft: 3 * LINE_HEIGHT,
        });

        expect(decision).toEqual({
            kind: 'split',
            breakPos: 180,
            fragmentHeight: 3 * LINE_HEIGHT,
        });
    });

    it('counts block padding into the first fragment height', () => {
        const decision = selectSplitPoint({
            ...baseArgs,
            lines: uniformLines(10, 8),
            spaceLeft: 8 + 4 * LINE_HEIGHT,
        });

        expect(decision).toEqual({
            kind: 'split',
            breakPos: 140,
            fragmentHeight: 8 + 4 * LINE_HEIGHT,
        });
    });

    it('relaxes the minimums on an empty page instead of pushing down', () => {
        const decision = selectSplitPoint({
            ...baseArgs,
            lines: uniformLines(2),
            spaceLeft: LINE_HEIGHT,
            canPushDown: false,
        });

        expect(decision).toEqual({
            kind: 'split',
            breakPos: 110,
            fragmentHeight: LINE_HEIGHT,
        });
    });

    it('force-places a single line taller than the page', () => {
        const decision = selectSplitPoint({
            ...baseArgs,
            lines: uniformLines(1),
            spaceLeft: 500,
            canPushDown: false,
        });

        expect(decision).toEqual({kind: 'forcePlace'});
    });
});
