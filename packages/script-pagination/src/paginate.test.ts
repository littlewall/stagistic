import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {paginate} from './paginate';
import type {
    BlockLine,
    PaginatorBlock,
    PaginatorMetrics,
} from './types';

const LINE = 20;

const metrics = (overrides: Partial<PaginatorMetrics> = {}): PaginatorMetrics => ({
    contentHeight: 100,
    topSpacing: 10,
    bottomSpacing: 10,
    orphanThreshold: 2 * LINE,
    minLinesBefore: 2,
    minLinesAfter: 2,
    epsilonPx: 1,
    ...overrides,
});

const heading = (key: string): PaginatorBlock => ({
    key,
    endKey: key,
    height: LINE,
    splittable: false,
    orphanCandidate: true,
});

const prose = (key: string, lineCount: number): PaginatorBlock => {
    const lines: BlockLine[] = Array.from({length: lineCount}, (_unused, index) => ({
        startPos: index,
        topRel: index * LINE,
    }));

    return {
        key,
        endKey: key,
        height: lineCount * LINE,
        splittable: true,
        orphanCandidate: false,
        getLineMap: () => ({lines, cleanHeight: lineCount * LINE}),
    };
};

describe('paginate', () => {
    it('keeps everything on one page when it fits', () => {
        const plan = paginate([heading('h1'), prose('d1', 3)], metrics());

        expect(plan.pageCount).toBe(1);
        expect(plan.breaks).toHaveLength(0);
    });

    it('pushes a non-splittable heading whole to the next page instead of tearing it', () => {
        const plan = paginate(
            [
                prose('fill', 4),
                heading('h2'),
                prose('d2', 1),
            ],
            metrics({contentHeight: 90}),
        );

        expect(plan.breaks.some(item => item.kind === 'pushDown' && item.atBlockKey === 'h2')).toBe(true);
        expect(plan.pageCount).toBe(2);
    });

    it('applies orphan pushdown so a heading is not stranded with <2 lines under it', () => {
        const plan = paginate(
            [
                prose('fill', 3),
                heading('h3'),
                prose('d3', 3),
            ],
            metrics({orphanThreshold: 40}),
        );

        expect(plan.breaks.some(item => item.kind === 'pushDown' && item.atBlockKey === 'h3')).toBe(true);
    });

    it('splits a tall splittable block honouring min-lines on each side', () => {
        const plan = paginate([prose('big', 10)], metrics());
        const split = plan.breaks.find(item => item.kind === 'split' && item.atBlockKey === 'big');

        expect(split?.isInlineBreak).toBe(true);
        expect(split?.breakPos).toBe(5);
        expect(plan.pageCount).toBe(2);
    });

    it('marks a page that resumes a split block as a continuation', () => {
        const plan = paginate([prose('a', 2), prose('big', 14)], metrics());

        expect(plan.pages.map(page => page.continuesBlock)).toEqual([
            false,
            true,
            true,
            true,
        ]);
        expect(plan.pages.map(page => page.startKey)).toEqual([
            'a',
            'big',
            'big',
            'big',
        ]);
    });

    it('starts a block on a fresh page for a forced new-page break', () => {
        const plan = paginate(
            [prose('a', 1), {...heading('b'), forcedBreak: 'new-page'}],
            metrics(),
        );

        expect(plan.breaks.some(item => item.kind === 'forced' && item.atBlockKey === 'b')).toBe(true);
        expect(plan.pageCount).toBe(2);
    });
});

describe('paginate blockOffsets', () => {
    it('gives a plain block the span it occupies', () => {
        const plan = paginate([heading('h1'), prose('d1', 2)], metrics());

        expect(plan.blockOffsets).toEqual([
            {
                key: 'h1',
                startOffset: 0,
                endOffset: LINE,
            },
            {
                key: 'd1',
                startOffset: LINE,
                endOffset: 3 * LINE,
            },
        ]);
    });

    it('starts a pushed-down block after the spacer, where it really lands', () => {
        const plan = paginate([prose('fill', 4), heading('h2')], metrics({contentHeight: 90}));

        // fill 80, leftover 10 + bottom 10 + top 10 = 30 of spacer, then h2.
        expect(plan.blockOffsets).toEqual([
            {
                key: 'fill',
                startOffset: 0,
                endOffset: 80,
            },
            {
                key: 'h2',
                startOffset: 110,
                endOffset: 130,
            },
        ]);
    });

    it('spans a split block from its first fragment to its last, spacer included', () => {
        const plan = paginate([prose('big', 10)], metrics());

        // 100 on page one, 20 of spacer, 100 on page two.
        expect(plan.blockOffsets).toEqual([
            {
                key: 'big',
                startOffset: 0,
                endOffset: 220,
            },
        ]);
    });

    it('gives a zero-height block equal start and end', () => {
        const plan = paginate([heading('h1'), {...heading('z'), height: 0}], metrics());

        expect(plan.blockOffsets[1]).toEqual({
            key: 'z',
            startOffset: LINE,
            endOffset: LINE,
        });
    });
});

it('reserves continuation cue height on each resumed page', () => {
    const plan = paginate([{...prose('speech', 13), continuationHeight: LINE}], metrics());

    expect(plan.breaks.filter(item => item.isInlineBreak).map(item => item.breakPos)).toEqual([5, 9]);
    expect(plan.pageCount).toBe(3);
});
