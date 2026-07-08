export interface BlockLine {
    /** Opaque line identifier; echoed back as a split's breakPos. */
    startPos: number,
    /** Line top relative to the block's border-box top (includes padding-top). */
    topRel: number,
}

export interface PaginatorBlock {
    key: string,
    height: number, // total incl. spacing-before/after
    splittable: boolean,
    orphanCandidate: boolean,
    forcedBreak?: 'new-page' | 'odd-page',
    getLines?: () => BlockLine[], // only consulted for splittable blocks
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

export interface PlacedFragment {
    blockKey: string,
    pageIndex: number, // 0-based
    contentTop: number, // y of this fragment's first line, from page top
    fromLine: number, // inclusive index into getLines() (0 for whole blocks)
    toLine: number, // exclusive
    isBlockStart: boolean,
    isBlockEnd: boolean,
}

export interface PageBreak {
    kind: 'pushDown' | 'split' | 'forced' | 'oddBlank',
    atBlockKey: string,
    afterBlockKey: string | null, // block whose end anchors a whole-block spacer (null at doc start)
    breakPos: number | null, // BlockLine.startPos for splits, else null
    spacerHeight: number, // leftover + bottomSpacing + topSpacing (editor spacer height)
    dividerOffset: number, // leftover + bottomSpacing
    isInlineBreak: boolean, // true for splits
}

export interface PageInfo {
    index: number, // 1-based
    startKey: string,
    endKey: string,
    startOffset: number,
    endOffset: number,
}

export interface PaginationPlan {
    pageCount: number,
    pages: PageInfo[],
    fragments: PlacedFragment[],
    breaks: PageBreak[],
    endSpacer: {afterBlockKey: string | null, height: number} | null,
}
