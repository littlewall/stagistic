import {selectSplitPoint} from './selectSplitPoint';
import type {
    BlockLine,
    PageBreak,
    PageInfo,
    PaginationPlan,
    PaginatorBlock,
    PaginatorMetrics,
    PlacedFragment,
} from './types';

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

    const fragments: PlacedFragment[] = [];
    const breaks: PageBreak[] = [];
    const pages: PageInfo[] = [];

    if (contentHeight <= 0) {
        return {
            pageCount: 1, pages: [], fragments: [], breaks: [], endSpacer: null,
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

    blocks.forEach(block => {
        // --- Forced breaks (export only; editor blocks never set forcedBreak) ---
        if (block.forcedBreak && pageStartKey !== null) {
            const leftover = Math.max(0, contentHeight - currentHeight);

            breaks.push({
                kind: 'forced',
                atBlockKey: block.key,
                afterBlockKey: lastBlockEndKey,
                breakPos: null,
                spacerHeight: leftover + bottomSpacing + topSpacing,
                dividerOffset: leftover + bottomSpacing,
                isInlineBreak: false,
            });
            offsetCursor += leftover + bottomSpacing + topSpacing;
            closePage();

            // odd-page: if we would resume on an even page number, insert a blank page.
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
                    startOffset: pageStartOffset,
                    endOffset: offsetCursor,
                });
                pageIndex += 1;
            }
        }

        // --- Orphan pushdown for heading-like blocks ---
        const remainingBefore = Math.max(0, contentHeight - currentHeight);
        const remainingAfter = Math.max(0, remainingBefore - block.height);
        const shouldPushDown = block.orphanCandidate
            && block.height <= remainingBefore
            && remainingAfter < orphanThreshold
            && lastBlockEndKey !== null;

        if (shouldPushDown) {
            const leftover = remainingBefore;

            breaks.push({
                kind: 'pushDown',
                atBlockKey: block.key,
                afterBlockKey: lastBlockEndKey,
                breakPos: null,
                spacerHeight: leftover + bottomSpacing + topSpacing,
                dividerOffset: leftover + bottomSpacing,
                isInlineBreak: false,
            });
            offsetCursor += leftover + bottomSpacing + topSpacing;
            closePage();
        }

        // --- Place the block, splitting only if splittable ---
        let blockRemaining = block.height;
        let lineMapConsumed = 0;
        let lines: BlockLine[] | null | undefined = block.getLines ? null : undefined; // undefined = never splittable

        while (blockRemaining > 0) {
            ensurePageStart(block.key);

            const spaceLeft = Math.max(0, contentHeight - currentHeight);

            if (blockRemaining <= spaceLeft + epsilonPx) {
                const totalLines = block.getLines ? block.getLines().length : 1;
                const consumedLines = block.height <= 0
                    ? 0
                    : Math.round((block.height - blockRemaining) / (block.height / totalLines));

                fragments.push({
                    blockKey: block.key,
                    pageIndex,
                    contentTop: topSpacing + currentHeight - lineMapConsumed,
                    fromLine: consumedLines,
                    toLine: totalLines,
                    isBlockStart: consumedLines === 0,
                    isBlockEnd: true,
                });
                currentHeight += blockRemaining;
                offsetCursor += blockRemaining;
                blockRemaining = 0;
                lastBlockEndKey = block.key;
                break;
            }

            const canPushDown = currentHeight > 0;

            if (!block.splittable || !block.getLines) {
                if (canPushDown) {
                    const leftover = spaceLeft;

                    breaks.push({
                        kind: 'pushDown',
                        atBlockKey: block.key,
                        afterBlockKey: lastBlockEndKey,
                        breakPos: null,
                        spacerHeight: leftover + bottomSpacing + topSpacing,
                        dividerOffset: leftover + bottomSpacing,
                        isInlineBreak: false,
                    });
                    offsetCursor += leftover + bottomSpacing + topSpacing;
                    closePage();
                    continue;
                }

                // force-place an over-tall non-splittable block
                const totalLines = block.getLines ? block.getLines().length : 1;

                fragments.push({
                    blockKey: block.key,
                    pageIndex,
                    contentTop: topSpacing + currentHeight,
                    fromLine: 0,
                    toLine: totalLines,
                    isBlockStart: true,
                    isBlockEnd: true,
                });
                currentHeight += blockRemaining;
                offsetCursor += blockRemaining;
                blockRemaining = 0;
                lastBlockEndKey = block.key;
                break;
            }

            if (!lines) {
                lines = block.getLines();
            }

            const consumedHeight = block.height - blockRemaining;
            const decision = selectSplitPoint({
                lines,
                consumedHeight,
                spaceLeft,
                minLinesBefore,
                minLinesAfter,
                epsilonPx,
                canPushDown,
            });

            if (decision.kind !== 'split') {
                if (decision.kind === 'pushDown' && canPushDown) {
                    const leftover = spaceLeft;

                    breaks.push({
                        kind: 'pushDown',
                        atBlockKey: block.key,
                        afterBlockKey: lastBlockEndKey,
                        breakPos: null,
                        spacerHeight: leftover + bottomSpacing + topSpacing,
                        dividerOffset: leftover + bottomSpacing,
                        isInlineBreak: false,
                    });
                    offsetCursor += leftover + bottomSpacing + topSpacing;
                    closePage();
                    continue;
                }

                const totalLines = lines.length;
                const consumedLines = lines.findIndex(line => line.topRel >= consumedHeight - epsilonPx);

                fragments.push({
                    blockKey: block.key,
                    pageIndex,
                    contentTop: topSpacing + currentHeight - consumedHeight,
                    fromLine: consumedLines < 0 ? 0 : consumedLines,
                    toLine: totalLines,
                    isBlockStart: consumedLines <= 0,
                    isBlockEnd: true,
                });
                currentHeight += blockRemaining;
                offsetCursor += blockRemaining;
                blockRemaining = 0;
                lastBlockEndKey = block.key;
                break;
            }

            const {breakPos, fragmentHeight} = decision;
            const leftover = Math.max(0, spaceLeft - fragmentHeight);
            const fromLine = lines.findIndex(line => line.topRel >= consumedHeight - epsilonPx);
            const toLine = lines.findIndex(line => line.startPos === breakPos);

            fragments.push({
                blockKey: block.key,
                pageIndex,
                contentTop: topSpacing + currentHeight - consumedHeight,
                fromLine: fromLine < 0 ? 0 : fromLine,
                toLine: toLine < 0 ? lines.length : toLine,
                isBlockStart: consumedHeight <= 0,
                isBlockEnd: false,
            });

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
            lineMapConsumed = consumedHeight + fragmentHeight;
            closePage(block.key);
        }
    });

    const remaining = Math.max(0, contentHeight - currentHeight);
    const endSpacerHeight = remaining + bottomSpacing;

    if (pageStartKey === null) {
        pageStartKey = lastBlockEndKey ?? '';
        pageStartOffset = offsetCursor;
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
        fragments,
        breaks,
        endSpacer: {afterBlockKey: lastBlockEndKey, height: endSpacerHeight},
    };
};
