import {selectSplitPoint} from './selectSplitPoint';
import type {
    BlockLineMap,
    PageBreak,
    PageInfo,
    PaginationPlan,
    PaginatorBlock,
    PaginatorMetrics,
} from './types';

/*
 * Height-agnostic pagination. A faithful port of the editor's original
 * buildPaginationState loop: it never measures or renders — each consumer feeds
 * block heights + clean line maps (editor from the DOM, export from math) and
 * renders the returned `breaks` into its own output (spacer decorations / PDF
 * page breaks). The block `height` is the "dirty" fit height (may include
 * already-rendered spacers); once a split is needed, `getLineMap().cleanHeight`
 * takes over, exactly as the editor did.
 */
export const paginate = (
    blocks: PaginatorBlock[],
    metrics: PaginatorMetrics,
): PaginationPlan => {
    const {
        contentHeight,
        topSpacing,
        bottomSpacing,
        orphanThreshold,
        minLinesBefore,
        minLinesAfter,
        epsilonPx,
    } = metrics;

    const breaks: PageBreak[] = [];
    const pages: PageInfo[] = [];

    if (contentHeight <= 0) {
        return {
            pageCount: 1, pages: [], breaks: [], endSpacer: null,
        };
    }

    let currentHeight = 0;
    let pageIndex = 0;
    let pageStartKey: string | null = null;
    let pageStartOffset = 0;
    let offsetCursor = 0;
    let lastBlockEndKey: string | null = null;

    const closePage = (endKeyOverride?: string) => {
        if (pageStartKey === null) {
            return;
        }

        pages.push({
            index: pageIndex + 1,
            startKey: pageStartKey,
            endKey: endKeyOverride ?? lastBlockEndKey ?? pageStartKey,
            startOffset: pageStartOffset,
            endOffset: offsetCursor,
        });
        pageIndex += 1;
        currentHeight = 0;
        pageStartKey = null;
    };

    const ensurePageStart = (key: string) => {
        if (pageStartKey === null) {
            pageStartKey = key;
            pageStartOffset = offsetCursor;
        }
    };

    const emitWholeBreak = (kind: PageBreak['kind'], block: PaginatorBlock, leftover: number) => {
        breaks.push({
            kind,
            atBlockKey: block.key,
            afterBlockKey: lastBlockEndKey,
            breakPos: null,
            spacerHeight: leftover + bottomSpacing + topSpacing,
            dividerOffset: leftover + bottomSpacing,
            isInlineBreak: false,
        });
        offsetCursor += leftover + bottomSpacing + topSpacing;
        closePage();
    };

    blocks.forEach(block => {
        // --- Forced breaks (export only; editor blocks never set forcedBreak) ---
        if (block.forcedBreak && pageStartKey !== null) {
            emitWholeBreak('forced', block, Math.max(0, contentHeight - currentHeight));

            // odd-page: if the block would resume on an even page, insert a blank page.
            if (block.forcedBreak === 'odd-page' && (pageIndex + 1) % 2 === 0) {
                breaks.push({
                    kind: 'oddBlank',
                    atBlockKey: block.key,
                    afterBlockKey: lastBlockEndKey,
                    breakPos: null,
                    spacerHeight: contentHeight + bottomSpacing + topSpacing,
                    dividerOffset: contentHeight + bottomSpacing,
                    isInlineBreak: false,
                });
                offsetCursor += contentHeight + bottomSpacing + topSpacing;
                pages.push({
                    index: pageIndex + 1,
                    startKey: block.key,
                    endKey: block.key,
                    startOffset: offsetCursor,
                    endOffset: offsetCursor,
                });
                pageIndex += 1;
            }
        }

        // --- Orphan pushdown: keep a heading with the content beneath it. ---
        const remainingBefore = Math.max(0, contentHeight - currentHeight);
        const remainingAfter = Math.max(0, remainingBefore - block.height);
        const shouldPushDown = block.orphanCandidate
            && block.height <= remainingBefore
            && remainingAfter < orphanThreshold
            && lastBlockEndKey !== null;

        if (shouldPushDown) {
            emitWholeBreak('pushDown', block, remainingBefore);
        }

        // --- Place the block, splitting only if splittable. ---
        let blockRemaining = block.height;
        let lineMap: BlockLineMap | null = null;

        const placeRemainder = () => {
            currentHeight += blockRemaining;
            offsetCursor += blockRemaining;
            blockRemaining = 0;
            lastBlockEndKey = block.endKey;
        };

        while (blockRemaining > 0) {
            ensurePageStart(block.key);

            const spaceLeft = Math.max(0, contentHeight - currentHeight);

            if (blockRemaining <= spaceLeft + epsilonPx) {
                placeRemainder();
                break;
            }

            const canPushDown = currentHeight > 0;

            if (!block.splittable || !block.getLineMap) {
                if (canPushDown) {
                    emitWholeBreak('pushDown', block, spaceLeft);
                    continue;
                }

                placeRemainder();
                break;
            }

            if (!lineMap) {
                const consumed = Math.max(0, block.height - blockRemaining);

                lineMap = block.getLineMap();
                blockRemaining = Math.max(0, lineMap.cleanHeight - consumed);

                if (blockRemaining <= 0) {
                    placeRemainder();
                    break;
                }

                continue;
            }

            const decision = selectSplitPoint({
                lines: lineMap.lines,
                consumedHeight: Math.max(0, lineMap.cleanHeight - blockRemaining),
                spaceLeft,
                minLinesBefore,
                minLinesAfter,
                epsilonPx,
                canPushDown,
            });

            if (decision.kind !== 'split') {
                if (decision.kind === 'pushDown' && canPushDown) {
                    emitWholeBreak('pushDown', block, spaceLeft);
                    continue;
                }

                placeRemainder();
                break;
            }

            const {breakPos, fragmentHeight} = decision;
            const leftover = Math.max(0, spaceLeft - fragmentHeight);

            currentHeight += fragmentHeight;
            offsetCursor += fragmentHeight;
            breaks.push({
                kind: 'split',
                atBlockKey: block.key,
                afterBlockKey: lastBlockEndKey,
                breakPos,
                spacerHeight: leftover + bottomSpacing + topSpacing,
                dividerOffset: leftover + bottomSpacing,
                isInlineBreak: true,
            });
            offsetCursor += leftover + bottomSpacing + topSpacing;
            blockRemaining = Math.max(0, blockRemaining - fragmentHeight);
            closePage(block.key);
        }
    });

    const remaining = Math.max(0, contentHeight - currentHeight);
    const endSpacerHeight = remaining + bottomSpacing;

    if (pageStartKey === null) {
        /*
         * Degenerate final page (everything closed a page exactly): mirror the
         * editor's startPos/startOffset = 0. Number('') === 0.
         */
        pageStartKey = '';
        pageStartOffset = 0;
    }

    offsetCursor += endSpacerHeight;
    pages.push({
        index: pageIndex + 1,
        startKey: pageStartKey,
        endKey: lastBlockEndKey ?? pageStartKey,
        startOffset: pageStartOffset,
        endOffset: offsetCursor,
    });

    return {
        pageCount: pages.length,
        pages,
        breaks,
        endSpacer: {afterBlockKey: lastBlockEndKey, height: endSpacerHeight},
    };
};
