import type {
    PaginationBlockSpec,
    PaginationInput,
    PaginationMetricsSpec,
} from '@stagistic/test-oracles';
import {
    arbitraryNonsenseMetrics,
    arbitraryPaginationInput,
    oracleParameters,
} from '@stagistic/test-oracles';
import * as fc from 'fast-check';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {paginate} from './paginate';
import type {
    PaginationPlan,
    PaginatorBlock,
} from './types';

/*
 * Oracle for `paginate` (docs/adr/0001-property-oracles-fixed-seed.md). Rules, stated from the layout
 * rules and not from the implementation:
 * 1. every block is placed exactly once, in document order; its split fragments add up to the whole block;
 * 2. a page never holds more than the content height, except a page that holds one block that cannot be
 *    cut (atomic, no line geometry, or a single line);
 * 3. a block is cut only between its lines, never before its first or after its last, leaving at least
 *    `minLinesBefore` lines on the page and `minLinesAfter` lines on the next, unless the fragment is the
 *    only thing on its page (then one line on each side is enough);
 * 4. a heading that fits is never the last thing on a page when less than `orphanThreshold` space is left;
 * 5. a forced break starts a fresh page, an odd-page break on an odd page.
 * Only types are imported from the package under test; blocks come from the shared generator.
 */

const toBlocks = (specs: PaginationBlockSpec[]): PaginatorBlock[] => specs.map(spec => ({
    key: spec.key,
    endKey: spec.endKey,
    height: spec.height,
    continuationHeight: spec.continuationHeight,
    splittable: spec.kind !== 'unsplittable',
    orphanCandidate: spec.orphanCandidate,
    forcedBreak: spec.forcedBreak,
    getLineMap: spec.kind === 'prose'
        ? () => ({lines: spec.lines.map(line => ({...line})), cleanHeight: spec.height})
        : undefined,
}));

const run = ({blocks, metrics}: PaginationInput) => paginate(toBlocks(blocks), metrics);

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/* Index of the block a page key names (start key or end key), or -1. */
const blockIndexOf = (blocks: PaginationBlockSpec[], key: string) => blocks.findIndex(block => block.key === key || block.endKey === key);

/* The block a page ends on / starts on; the degenerate empty final page (start key '') has none. */
const pageRange = (blocks: PaginationBlockSpec[], plan: PaginationPlan, pageNumber: number) => {
    const page = plan.pages[pageNumber];

    if (page.startKey === '') {
        return null;
    }

    return {start: blockIndexOf(blocks, page.startKey), end: blockIndexOf(blocks, page.endKey)};
};

/* A block that no rule allows to cut: atomic, without line geometry, or a single line. */
const isUncuttable = (block: PaginationBlockSpec) => block.kind !== 'prose' || block.lines.length < 2;

const checkExactlyOnce = ({blocks}: PaginationInput, plan: PaginationPlan) => {
    expect(plan.blockOffsets.map(entry => entry.key)).toEqual(blocks.map(block => block.key));
    expect(plan.pages.map(page => page.index)).toEqual(plan.pages.map((_page, position) => position + 1));
    /* Every break ends one page, so there is exactly one page more than breaks. */
    expect(plan.pages).toHaveLength(plan.breaks.length + 1);

    let previousEnd = Number.NEGATIVE_INFINITY;
    let previousBlock = 0;

    plan.blockOffsets.forEach(entry => {
        expect(entry.startOffset).toBeGreaterThanOrEqual(previousEnd);
        expect(entry.endOffset).toBeGreaterThanOrEqual(entry.startOffset);
        previousEnd = entry.endOffset;
    });
    plan.breaks.forEach(entry => {
        const index = blocks.findIndex(block => block.key === entry.atBlockKey);

        expect(index).toBeGreaterThanOrEqual(previousBlock);
        previousBlock = index;
    });

    /* Every block lies on at least one page, and pages advance through the document. */
    const covered = new Set<number>();
    let previousStart = 0;

    plan.pages.forEach((_page, position) => {
        const range = pageRange(blocks, plan, position);

        if (range === null) {
            return;
        }

        expect(range.start).toBeGreaterThanOrEqual(previousStart);
        expect(range.end).toBeGreaterThanOrEqual(range.start);
        previousStart = range.start;

        for (let index = range.start; index <= range.end; index += 1) {
            covered.add(index);
        }
    });
    expect([...covered].toSorted((a, b) => a - b)).toEqual(blocks.map((_block, index) => index));

    /* Fragments reassemble to the block: its height + the spacers of its cuts + the cue repeated on later pages. */
    blocks.forEach((block, index) => {
        const offsets = plan.blockOffsets[index];
        const spacers = plan.breaks
            .filter(entry => entry.kind === 'split' && entry.atBlockKey === block.key)
            .map(entry => entry.spacerHeight);
        const resumed = plan.pages.filter(page => page.startKey === block.key && page.continuesBlock).length;

        expect(resumed).toBe(spacers.length);
        expect(offsets.endOffset - offsets.startOffset).toBe(block.height + sum(spacers) + resumed * (block.continuationHeight ?? 0));
    });
};

const checkNoOverflow = ({blocks, metrics}: PaginationInput, plan: PaginationPlan) => {
    const limit = metrics.contentHeight + metrics.topSpacing + metrics.bottomSpacing + metrics.epsilonPx;

    plan.pages.forEach((page, position) => {
        const range = pageRange(blocks, plan, position);

        if (range === null || page.endOffset - page.startOffset <= limit) {
            return;
        }

        expect(range.end).toBe(range.start);
        expect(isUncuttable(blocks[range.start])).toBe(true);
    });
};

const checkSplitPoints = ({blocks, metrics}: PaginationInput, plan: PaginationPlan) => {
    const lastCut = new Map<string, number>();

    plan.breaks.forEach((entry, position) => {
        if (entry.kind !== 'split') {
            expect(entry.breakPos).toBeNull();

            return;
        }

        const block = blocks.find(candidate => candidate.key === entry.atBlockKey);

        if (!block) {
            throw new Error(`Break names an unknown block ${entry.atBlockKey}.`);
        }

        const index = block.lines.findIndex(line => line.startPos === entry.breakPos);

        expect(block.kind).toBe('prose');
        /* Between lines: never before the first, never after the last. */
        expect(index).toBeGreaterThanOrEqual(1);

        const previous = lastCut.get(block.key) ?? 0;
        const before = index - previous;
        const after = block.lines.length - index;
        /* The page the cut ends: if the block's fragment opened it, nothing else shares the page. */
        const alone = plan.pages[position].startKey === block.key;

        expect(index).toBeGreaterThan(previous);
        expect(before).toBeGreaterThanOrEqual(alone ? 1 : metrics.minLinesBefore);
        expect(after).toBeGreaterThanOrEqual(alone ? 1 : metrics.minLinesAfter);
        lastCut.set(block.key, index);
    });
};

const checkHeadingsAndForcedBreaks = ({blocks, metrics}: PaginationInput, plan: PaginationPlan) => {
    blocks.forEach((block, index) => {
        if (index === 0) {
            return;
        }

        const offsets = plan.blockOffsets[index];

        if (block.forcedBreak) {
            expect(plan.breaks.some(entry => entry.kind === 'forced' && entry.atBlockKey === block.key)).toBe(true);

            if (block.forcedBreak === 'odd-page') {
                /* A blank page inserted before it shares its start key; the real page is the last one that opens with the block. */
                const opening = plan.pages.findLast(page => page.startKey === block.key && !page.continuesBlock);

                expect(opening?.index).toBeDefined();
                expect((opening?.index ?? 0) % 2).toBe(1);
            }
        }

        if (!block.orphanCandidate) {
            return;
        }

        const page = plan.pages.findLast(candidate => candidate.startOffset <= offsets.startOffset
            && offsets.endOffset <= candidate.endOffset
            && candidate.startKey !== '');

        if (!page || page.startKey === block.key) {
            return;
        }

        const lead = page.index > 1 ? blocks[blockIndexOf(blocks, page.startKey)].continuationHeight ?? 0 : 0;
        const leftover = metrics.contentHeight - lead - (offsets.endOffset - page.startOffset);

        /* Negative means it only fitted thanks to the epsilon; the heading rule applies when it fitted outright. */
        if (leftover >= 0) {
            expect(leftover).toBeGreaterThanOrEqual(metrics.orphanThreshold);
        }
    });
};

const check = (checker: (input: PaginationInput, plan: PaginationPlan) => void) => () => {
    fc.assert(
        fc.property(arbitraryPaginationInput, input => checker(input, run(input))),
        oracleParameters(),
    );
};

describe('paginate oracle', () => {
    it('places every block exactly once, in order, with fragments that add up', check(checkExactlyOnce));
    it('never overflows a page except with a block that cannot be cut', check(checkNoOverflow));
    it('cuts only between lines and respects the minimum lines on each side', check(checkSplitPoints));
    it('keeps headings off the page bottom and honours forced breaks', check(checkHeadingsAndForcedBreaks));

    it('never throws and keeps every block once for any metrics', () => {
        fc.assert(
            fc.property(arbitraryPaginationInput, arbitraryNonsenseMetrics, ({blocks}, metrics: PaginationMetricsSpec) => {
                const plan = paginate(toBlocks(blocks), metrics);

                if (metrics.contentHeight <= 0) {
                    expect(plan.pageCount).toBe(1);

                    return;
                }

                expect(plan.blockOffsets.map(entry => entry.key)).toEqual(blocks.map(block => block.key));
            }),
            oracleParameters(),
        );
    });

    /* F4: shrunk counterexample; a forced heading opens a page and is not pushed down from it. */
    it('adds no empty page for a forced heading that would leave too little space', () => {
        const input: PaginationInput = {
            metrics: {
                contentHeight: 62,
                topSpacing: 11,
                bottomSpacing: 26,
                orphanThreshold: 58,
                minLinesBefore: 2,
                minLinesAfter: 1,
                epsilonPx: 2,
            },
            blocks: [
                {
                    key: 'b0',
                    endKey: 'b0:end',
                    kind: 'unsplittable',
                    orphanCandidate: false,
                    height: 1,
                    lines: [],
                },
                {
                    key: 'b1',
                    endKey: 'b1:end',
                    kind: 'unsplittable',
                    orphanCandidate: true,
                    height: 5,
                    forcedBreak: 'new-page',
                    lines: [],
                },
            ],
        };
        const plan = run(input);

        expect(plan.breaks).toHaveLength(1);
        expect(plan.pages).toHaveLength(2);
    });

    it('paginates an empty script to one empty page', () => {
        const plan = paginate([], {
            contentHeight: 100,
            topSpacing: 10,
            bottomSpacing: 10,
            orphanThreshold: 40,
            minLinesBefore: 2,
            minLinesAfter: 2,
            epsilonPx: 1,
        });

        expect(plan.pageCount).toBe(1);
        expect(plan.breaks).toHaveLength(0);
    });
});
