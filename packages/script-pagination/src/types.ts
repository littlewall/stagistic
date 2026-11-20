export interface BlockLine {
    /** Opaque line identifier; echoed back as a split's breakPos. */
    startPos: number,
    /** Line top relative to the block's border-box top (includes padding-top). */
    topRel: number,
}

export interface BlockLineMap {
    lines: BlockLine[],
    /** Block height measured with inline-break spacers hidden (clean geometry). */
    cleanHeight: number,
}

export interface PaginatorBlock {
    /** Start-position identifier; becomes a page's startKey and a split's page endKey. */
    key: string,
    /** End-position identifier; tracked as lastBlockEnd, a whole page's endKey, and a pushdown anchor. */
    endKey: string,
    /**
     * Measured height used for the initial fit check. May include already-rendered
     * inline-break spacers (the editor's "dirty" height); once a split is actually
     * needed, `getLineMap().cleanHeight` takes over — mirroring the editor exactly.
     */
    height: number,
    /** Space for a repeated cue when this block starts/resumes on a later page. */
    continuationHeight?: number,
    splittable: boolean,
    orphanCandidate: boolean,
    forcedBreak?: 'new-page' | 'odd-page',
    /** Clean line geometry; consulted only for splittable blocks when a split is needed. */
    getLineMap?: () => BlockLineMap,
}

export interface PaginatorMetrics {
    contentHeight: number,
    topSpacing: number,
    bottomSpacing: number,
    orphanThreshold: number,
    minLinesBefore: number,
    minLinesAfter: number,
    epsilonPx: number,
}

export interface PageBreak {
    kind: 'pushDown' | 'split' | 'forced' | 'oddBlank',
    /** The block whose placement caused the break. */
    atBlockKey: string,
    /** End identifier of the last fully-placed block (spacer anchor); null at doc start. */
    afterBlockKey: string | null,
    /** BlockLine.startPos where a splittable block is cut; null for whole-block breaks. */
    breakPos: number | null,
    /** Editor spacer height = leftover + bottomSpacing + topSpacing. */
    spacerHeight: number,
    /** Editor divider offset = leftover + bottomSpacing. */
    dividerOffset: number,
    /** True for mid-block splits (inline-break spacer), false for whole-block breaks. */
    isInlineBreak: boolean,
}

export interface PageInfo {
    index: number, // 1-based
    startKey: string,
    endKey: string,
    startOffset: number,
    endOffset: number,
    /** True when the page opens with the continuation of a block split on the previous page (`startKey` is then that block's start). */
    continuesBlock: boolean,
}

export interface PaginationPlan {
    pageCount: number,
    pages: PageInfo[],
    breaks: PageBreak[],
    endSpacer: {afterBlockKey: string | null, height: number} | null,
    /** Where each block really lands, in page-flow offsets: from its first fragment to right after its last (spacers between fragments included). */
    blockOffsets: BlockOffsets[],
}

export interface BlockOffsets {
    key: string,
    startOffset: number,
    endOffset: number,
}
