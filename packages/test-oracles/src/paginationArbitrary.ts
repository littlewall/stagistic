import * as fc from 'fast-check';

/*
 * Generator for the paginator seam (`paginate(blocks, metrics)` of @stagistic/script-pagination).
 * Plain data, no import of the code under test: the oracle test builds `PaginatorBlock`s from these specs.
 * Omitted on purpose (not producible by the editor / export): non-positive block heights and "dirty"
 * heights that differ from the clean line-map height.
 */

export interface PaginationLineSpec {
    startPos: number,
    topRel: number,
}

export interface PaginationBlockSpec {
    key: string,
    endKey: string,
    /* `unsplittable`: heading-like or atomic; `prose`: splittable with a line map; `noLineMap`: splittable flag, no geometry. */
    kind: 'unsplittable' | 'prose' | 'noLineMap',
    orphanCandidate: boolean,
    height: number,
    continuationHeight?: number,
    forcedBreak?: 'new-page' | 'odd-page',
    /* Clean line geometry of a `prose` block; `height` equals its clean height. */
    lines: PaginationLineSpec[],
}

export interface PaginationMetricsSpec {
    contentHeight: number,
    topSpacing: number,
    bottomSpacing: number,
    orphanThreshold: number,
    minLinesBefore: number,
    minLinesAfter: number,
    epsilonPx: number,
}

export interface PaginationInput {
    blocks: PaginationBlockSpec[],
    metrics: PaginationMetricsSpec,
}

/*
 * A block is at least one text line tall. Blocks within the fit epsilon (a few px) are omitted: they can
 * squeeze onto an already overflowing page, which the editor never produces.
 */
const MIN_BLOCK_HEIGHT = 8;

const arbitraryMetrics = fc.record({
    contentHeight: fc.integer({min: 60, max: 400}),
    topSpacing: fc.integer({min: 0, max: 30}),
    bottomSpacing: fc.integer({min: 0, max: 30}),
    orphanThreshold: fc.integer({min: 0, max: 100}),
    minLinesBefore: fc.integer({min: 1, max: 3}),
    minLinesAfter: fc.integer({min: 1, max: 3}),
    epsilonPx: fc.integer({min: 0, max: 2}),
});

const arbitraryBlock = (metrics: PaginationMetricsSpec) => {
    const lineMax = Math.max(10, Math.floor(metrics.contentHeight / 3));

    return fc.record({
        kind: fc.constantFrom('unsplittable', 'unsplittable', 'prose', 'prose', 'prose', 'noLineMap'),
        orphanCandidate: fc.boolean(),
        /* Mostly small atomic blocks (cues, scene headings), sometimes taller than a page. */
        unsplittableHeight: fc.oneof(
            {weight: 4, arbitrary: fc.integer({min: MIN_BLOCK_HEIGHT, max: 40})},
            {weight: 1, arbitrary: fc.integer({min: MIN_BLOCK_HEIGHT, max: metrics.contentHeight * 2})},
        ),
        noLineMapHeight: fc.integer({min: MIN_BLOCK_HEIGHT, max: metrics.contentHeight * 2}),
        lineHeights: fc.array(fc.integer({min: 8, max: lineMax}), {minLength: 1, maxLength: 30}),
        padding: fc.integer({min: 0, max: 4}),
        continuationHeight: fc.option(fc.integer({min: 0, max: Math.floor(metrics.contentHeight / 4)}), {nil: undefined}),
        forcedBreak: fc.option(
            fc.constantFrom('new-page' as const, 'odd-page' as const),
            {nil: undefined, freq: 12},
        ),
    });
};

export const arbitraryPaginationInput: fc.Arbitrary<PaginationInput> = arbitraryMetrics.chain(metrics => fc
    .array(arbitraryBlock(metrics), {maxLength: 30, size: 'large'})
    .map((raw): PaginationInput => ({
        metrics,
        blocks: raw.map((entry, index) => {
            const lines: PaginationLineSpec[] = [];
            let top = entry.padding;
            let startPos = 10 * (index + 1);

            entry.lineHeights.forEach(lineHeight => {
                lines.push({startPos, topRel: top});
                top += lineHeight;
                startPos += lineHeight + 3;
            });

            const prose = entry.kind === 'prose';
            const height = prose ? top + entry.padding : entry.kind === 'noLineMap' ? entry.noLineMapHeight : entry.unsplittableHeight;

            return {
                key: `b${index}`,
                endKey: `b${index}:end`,
                kind: entry.kind,
                /* Only atomic blocks are headings (character cue, scene), as in the editor. */
                orphanCandidate: entry.kind === 'unsplittable' && entry.orphanCandidate,
                height,
                continuationHeight: entry.continuationHeight,
                forcedBreak: entry.forcedBreak,
                lines: prose ? lines : [],
            };
        }),
    })));

/* Arbitrary metrics, including nonsense ones, for the never-crashes property. Line minimums stay >= 1 (the package constants are 2). */
export const arbitraryNonsenseMetrics: fc.Arbitrary<PaginationMetricsSpec> = fc.record({
    contentHeight: fc.integer({min: -5, max: 300}),
    topSpacing: fc.integer({min: -5, max: 30}),
    bottomSpacing: fc.integer({min: -5, max: 30}),
    orphanThreshold: fc.integer({min: -5, max: 400}),
    minLinesBefore: fc.integer({min: 1, max: 5}),
    minLinesAfter: fc.integer({min: 1, max: 5}),
    epsilonPx: fc.integer({min: 0, max: 5}),
});
