import {
    describe, expect, it,
} from 'vite-plus/test';

import {paginate} from './paginate';
import type {
    BlockLine, PaginatorBlock, PaginatorMetrics,
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
    height: LINE,
    splittable: false,
    orphanCandidate: true,
});

const prose = (key: string, lineCount: number): PaginatorBlock => {
    const lines: BlockLine[] = Array.from({length: lineCount}, (_u, index) => ({
        startPos: index,
        topRel: index * LINE,
    }));

    return {
        key,
        height: lineCount * LINE,
        splittable: true,
        orphanCandidate: false,
        getLines: () => lines,
    };
};

const pageOf = (plan: ReturnType<typeof paginate>, key: string) => plan.fragments.find(fragment => fragment.blockKey === key)?.pageIndex;

describe('paginate', () => {
    it('keeps everything on one page when it fits', () => {
        const plan = paginate([heading('h1'), prose('d1', 3)], metrics());

        expect(plan.pageCount).toBe(1);
        expect(plan.breaks).toHaveLength(0);
        expect(pageOf(plan, 'h1')).toBe(0);
        expect(pageOf(plan, 'd1')).toBe(0);
    });

    it('pushes a non-splittable heading whole to the next page instead of tearing it', () => {
        // Fill the page to 90 of 100; a 20px heading cannot fit → whole block down.
        const plan = paginate(
            [
                prose('fill', 4),
                heading('h2'),
                prose('d2', 1),
            ],
            metrics({contentHeight: 90}),
        );

        expect(pageOf(plan, 'fill')).toBe(0);
        expect(pageOf(plan, 'h2')).toBe(1);
        expect(plan.breaks.some(b => b.kind === 'pushDown' && b.atBlockKey === 'h2')).toBe(true);
    });

    it('applies orphan pushdown so a heading is not stranded with <2 lines under it', () => {
        /*
         * Page holds 100. fill uses 60. heading (20) fits, leaving 20 (<40 threshold)
         * and its dialogue would be orphaned → push the heading down.
         */
        const plan = paginate(
            [
                prose('fill', 3),
                heading('h3'),
                prose('d3', 3),
            ],
            metrics({orphanThreshold: 40}),
        );

        expect(pageOf(plan, 'fill')).toBe(0);
        expect(pageOf(plan, 'h3')).toBe(1);
    });

    it('splits a tall splittable block honouring min-lines on each side', () => {
        // Page holds 100 (5 lines). A 10-line block splits: 5 lines then 5 lines.
        const plan = paginate([prose('big', 10)], metrics());

        const fragments = plan.fragments.filter(f => f.blockKey === 'big');

        expect(fragments).toHaveLength(2);
        expect(fragments[0]).toMatchObject({
            pageIndex: 0, fromLine: 0, toLine: 5,
        });
        expect(fragments[1]).toMatchObject({
            pageIndex: 1, fromLine: 5, toLine: 10,
        });
        expect(plan.breaks.some(b => b.kind === 'split' && b.isInlineBreak)).toBe(true);
    });

    it('starts a block on a fresh page for a forced new-page break', () => {
        const plan = paginate(
            [prose('a', 1), {...heading('b'), forcedBreak: 'new-page'}],
            metrics(),
        );

        expect(pageOf(plan, 'a')).toBe(0);
        expect(pageOf(plan, 'b')).toBe(1);
        expect(plan.breaks.some(b => b.kind === 'forced' && b.atBlockKey === 'b')).toBe(true);
    });
});
