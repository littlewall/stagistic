import {
    Decoration,
    type EditorView,
} from '@tiptap/pm/view';

import {
    FOUNTAIN_COLUMN_GROUP_NODE_NAME,
    isFountainBlockNodeName,
} from '../../../fountainCore';
import {
    FIT_EPSILON_PX,
    MIN_SPLIT_LINES_AFTER,
    MIN_SPLIT_LINES_BEFORE,
    ORPHAN_PUSHDOWN_TYPES,
    SPLITTABLE_BLOCK_TYPES,
} from '../constants';
import {createSpacerElement} from '../dom/createSpacerElement';
import {buildLineMap} from '../measure/buildLineMap';
import {
    type BlockCacheEntry,
    type BlockLineMap,
    type BuildPaginationStateResult,
    type PaginationOptions,
    type PaginationState,
} from '../types';
import {resolveBlockMeasurement} from './resolveBlockMeasurement';
import {
    buildEmptyPaginationStateResult,
    buildFinalPaginationStateResult,
} from './resultBuilders';
import {selectSplitPoint} from './selectSplitPoint';

export const buildPaginationState = (
    view: EditorView,
    options: PaginationOptions,
    cache: Map<string, BlockCacheEntry>,
): BuildPaginationStateResult => {
    const decorations: Decoration[] = [];
    const pages: PaginationState['pages'] = [];
    const nextCache = new Map<string, BlockCacheEntry>();
    let hasInlineBreaks = false;
    let usedFallbackMeasurements = false;

    const topSpacing = Math.max(0, options.marginTop);
    const bottomSpacing = Math.max(0, options.marginBottom);
    const contentHeight = Math.max(0, options.pageHeight - topSpacing - bottomSpacing);
    const fallbackHeight = Math.max(0, options.lineHeightPx);
    const orphanThreshold = Math.max(0, options.lineHeightPx * 2);

    let currentHeight = 0;
    let pageIndex = 0;
    let pageStartPos: number | null = null;
    let pageStartOffset = 0;
    let offsetCursor = 0;
    let lastBlockEndPos: number | null = null;

    if (contentHeight <= 0) {
        return buildEmptyPaginationStateResult({
            options,
            contentHeight,
            fallbackHeight,
            nextCache,
            hasInlineBreaks,
            usedFallbackMeasurements,
        });
    }

    view.state.doc.forEach((node, offset) => {
        if (node.type.name === FOUNTAIN_COLUMN_GROUP_NODE_NAME) {
            return;
        }

        if (!isFountainBlockNodeName(node.type.name)) {
            return;
        }

        const attrs = node.attrs as Record<string, unknown>;
        const blockType = attrs.blockType as string | undefined;
        const isSplittable = blockType ? SPLITTABLE_BLOCK_TYPES.has(blockType) : false;
        const isOrphanCandidate = blockType ? ORPHAN_PUSHDOWN_TYPES.has(blockType) : false;
        let blockDom: HTMLElement | null | undefined;
        const getBlockDom = () => {
            if (blockDom === undefined) {
                blockDom = view.nodeDOM(offset) as HTMLElement | null;
            }

            return blockDom;
        };
        const resolvedBlock = resolveBlockMeasurement({
            view,
            node,
            pos: offset,
            getDom: getBlockDom,
            cache,
            nextCache,
            fallbackHeight,
        });
        const blockHeight = resolvedBlock.height;
        const blockHasInlineBreaks = resolvedBlock.hasInlineBreaks;

        if (resolvedBlock.usedFallbackMeasurement) {
            usedFallbackMeasurements = true;
        }

        if (blockHasInlineBreaks) {
            hasInlineBreaks = true;
        }

        const ensurePageStart = () => {
            if (pageStartPos === null) {
                pageStartPos = offset;
                pageStartOffset = offsetCursor;
            }
        };

        const closePage = (endPosOverride?: number) => {
            if (pageStartPos === null) {
                return;
            }

            pages.push({
                index: pageIndex + 1,
                startPos: pageStartPos,
                endPos: endPosOverride ?? lastBlockEndPos ?? pageStartPos,
                startOffset: pageStartOffset,
                endOffset: offsetCursor,
            });

            pageIndex += 1;
            currentHeight = 0;
            pageStartPos = null;
        };

        const remainingBefore = Math.max(0, contentHeight - currentHeight);
        const remainingAfter = Math.max(0, remainingBefore - blockHeight);
        const shouldPushDown = isOrphanCandidate
            && blockHeight <= remainingBefore
            && remainingAfter < orphanThreshold;

        if (shouldPushDown && lastBlockEndPos !== null) {
            const spacerHeight = remainingBefore + bottomSpacing + topSpacing;
            const dividerOffset = remainingBefore + bottomSpacing;

            decorations.push(Decoration.widget(
                lastBlockEndPos,
                () => createSpacerElement(spacerHeight, options, dividerOffset),
                {side: 1},
            ));
            offsetCursor += spacerHeight;
            closePage();
        }

        let blockRemaining = blockHeight;
        let lineMap: BlockLineMap | null = null;

        const pushDownToNextPage = (spaceLeftNow: number, anchorPos: number) => {
            const spacerHeight = spaceLeftNow + bottomSpacing + topSpacing;
            const dividerOffset = spaceLeftNow + bottomSpacing;

            decorations.push(Decoration.widget(
                anchorPos,
                () => createSpacerElement(spacerHeight, options, dividerOffset),
                {side: 1},
            ));
            offsetCursor += spacerHeight;
            closePage();
        };

        const placeRemainder = () => {
            currentHeight += blockRemaining;
            offsetCursor += blockRemaining;
            blockRemaining = 0;
            lastBlockEndPos = offset + node.nodeSize;
        };

        while (blockRemaining > 0) {
            ensurePageStart();

            const spaceLeft = Math.max(0, contentHeight - currentHeight);

            if (blockRemaining <= spaceLeft + FIT_EPSILON_PX) {
                placeRemainder();
                break;
            }

            const pushAnchor = currentHeight > 0 ? lastBlockEndPos : null;
            const domForSplit = getBlockDom();

            if (!isSplittable || !domForSplit) {
                if (pushAnchor !== null) {
                    pushDownToNextPage(spaceLeft, pushAnchor);
                    continue;
                }

                placeRemainder();
                break;
            }

            if (!lineMap) {
                const consumed = Math.max(0, blockHeight - blockRemaining);

                lineMap = buildLineMap(view, offset, node, domForSplit);
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
                minLinesBefore: MIN_SPLIT_LINES_BEFORE,
                minLinesAfter: MIN_SPLIT_LINES_AFTER,
                epsilonPx: FIT_EPSILON_PX,
                canPushDown: pushAnchor !== null,
            });

            if (decision.kind !== 'split') {
                if (decision.kind === 'pushDown' && pushAnchor !== null) {
                    pushDownToNextPage(spaceLeft, pushAnchor);
                    continue;
                }

                placeRemainder();
                break;
            }

            const {breakPos, fragmentHeight} = decision;
            const leftover = Math.max(0, spaceLeft - fragmentHeight);
            const spacerHeight = leftover + bottomSpacing + topSpacing;
            const dividerOffset = leftover + bottomSpacing;

            currentHeight += fragmentHeight;
            offsetCursor += fragmentHeight;
            decorations.push(Decoration.widget(
                breakPos,
                () => createSpacerElement(spacerHeight, options, dividerOffset, true),
                {side: 1},
            ));
            hasInlineBreaks = true;

            const cacheEntry = nextCache.get(resolvedBlock.key);

            if (cacheEntry && !cacheEntry.hasInlineBreaks) {
                cacheEntry.hasInlineBreaks = true;
            }

            offsetCursor += spacerHeight;
            blockRemaining = Math.max(0, blockRemaining - fragmentHeight);
            closePage(offset);
        }
    });

    const remaining = Math.max(0, contentHeight - currentHeight);
    const endSpacerHeight = remaining + bottomSpacing;
    const endSpacerPos = lastBlockEndPos ?? 0;

    if (endSpacerHeight > 0) {
        decorations.push(Decoration.widget(
            endSpacerPos,
            () => createSpacerElement(endSpacerHeight, options),
            {side: 1},
        ));
        offsetCursor += endSpacerHeight;
    }

    if (pageStartPos === null) {
        pageStartPos = 0;
        pageStartOffset = 0;
    }

    pages.push({
        index: pageIndex + 1,
        startPos: pageStartPos,
        endPos: lastBlockEndPos ?? 0,
        startOffset: pageStartOffset,
        endOffset: offsetCursor,
    });

    return buildFinalPaginationStateResult({
        view,
        decorations,
        pages,
        options,
        contentHeight,
        fallbackHeight,
        nextCache,
        hasInlineBreaks,
        usedFallbackMeasurements,
    });
};
