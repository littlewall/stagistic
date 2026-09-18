import {
    paginate,
    type PaginatorBlock,
} from '@stagistic/script-pagination';
import {
    Decoration,
    type EditorView,
} from '@tiptap/pm/view';

import {
    isScriptBlockNodeName,
} from '../../../scriptCore';
import {
    FIT_EPSILON_PX,
    isOrphanCandidateBlockType,
    isSplittableBlockType,
    MIN_SPLIT_LINES_AFTER,
    MIN_SPLIT_LINES_BEFORE,
} from '../constants';
import {createSpacerElement} from '../dom/createSpacerElement';
import {buildLineMap} from '../measure/buildLineMap';
import {
    type BlockCacheEntry,
    type BuildPaginationStateResult,
    type PaginationOptions,
    type PaginationState,
} from '../types';
import {resolveBlockMeasurement} from './resolveBlockMeasurement';
import {
    buildEmptyPaginationStateResult,
    buildFinalPaginationStateResult,
} from './resultBuilders';

export const buildPaginationState = (
    view: EditorView,
    options: PaginationOptions,
    cache: Map<string, BlockCacheEntry>,
): BuildPaginationStateResult => {
    const nextCache = new Map<string, BlockCacheEntry>();
    let hasInlineBreaks = false;
    let usedFallbackMeasurements = false;

    const topSpacing = Math.max(0, options.marginTop);
    const bottomSpacing = Math.max(0, options.marginBottom);
    const contentHeight = Math.max(0, options.pageHeight - topSpacing - bottomSpacing);
    const fallbackHeight = Math.max(0, options.lineHeightPx);
    const orphanThreshold = Math.max(0, options.lineHeightPx * 2);

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

    const paginatorBlocks: PaginatorBlock[] = [];
    const measurementKeyByBlockKey = new Map<string, string>();

    view.state.doc.forEach((node, offset) => {
        if (!isScriptBlockNodeName(node.type.name)) {
            return;
        }

        const attrs = node.attrs as Record<string, unknown>;
        const blockType = attrs.blockType as string | undefined;
        const blockDom = view.nodeDOM(offset) as HTMLElement | null;
        const resolvedBlock = resolveBlockMeasurement({
            view,
            node,
            pos: offset,
            getDom: () => blockDom,
            cache,
            nextCache,
            fallbackHeight,
        });

        if (resolvedBlock.usedFallbackMeasurement) {
            usedFallbackMeasurements = true;
        }

        if (resolvedBlock.hasInlineBreaks) {
            hasInlineBreaks = true;
        }

        /*
         * A hidden block (a collapsed scene's body) occupies no space, so it can
         * neither be split across a break nor pull a following block down as an
         * orphan — it only stays in the list to keep page start/end positions
         * anchored to real document positions.
         */
        const splittable = !resolvedBlock.isHidden && isSplittableBlockType(blockType);
        const key = String(offset);

        measurementKeyByBlockKey.set(key, resolvedBlock.key);
        paginatorBlocks.push({
            key,
            endKey: String(offset + node.nodeSize),
            height: resolvedBlock.height,
            splittable,
            orphanCandidate: !resolvedBlock.isHidden && isOrphanCandidateBlockType(blockType),
            getLineMap: splittable && blockDom
                ? () => buildLineMap(view, offset, node, blockDom)
                : undefined,
        });
    });

    const plan = paginate(paginatorBlocks, {
        contentHeight,
        topSpacing,
        bottomSpacing,
        orphanThreshold,
        minLinesBefore: MIN_SPLIT_LINES_BEFORE,
        minLinesAfter: MIN_SPLIT_LINES_AFTER,
        epsilonPx: FIT_EPSILON_PX,
    });

    const decorations: Decoration[] = [];

    plan.breaks.forEach(item => {
        if (item.isInlineBreak && item.breakPos !== null) {
            decorations.push(Decoration.widget(
                item.breakPos,
                () => createSpacerElement(item.spacerHeight, options, item.dividerOffset, true),
                {side: 1},
            ));

            const measurementKey = measurementKeyByBlockKey.get(item.atBlockKey);
            const cacheEntry = measurementKey ? nextCache.get(measurementKey) : undefined;

            if (cacheEntry && !cacheEntry.hasInlineBreaks) {
                cacheEntry.hasInlineBreaks = true;
            }

            hasInlineBreaks = true;

            return;
        }

        if (item.afterBlockKey === null) {
            return;
        }

        decorations.push(Decoration.widget(
            Number(item.afterBlockKey),
            () => createSpacerElement(item.spacerHeight, options, item.dividerOffset),
            {side: 1},
        ));
    });

    if (plan.endSpacer && plan.endSpacer.height > 0) {
        const endPos = plan.endSpacer.afterBlockKey !== null
            ? Number(plan.endSpacer.afterBlockKey)
            : 0;

        decorations.push(Decoration.widget(
            endPos,
            () => createSpacerElement(plan.endSpacer!.height, options),
            {side: 1},
        ));
    }

    const pages: PaginationState['pages'] = plan.pages.map(page => ({
        index: page.index,
        startPos: Number(page.startKey),
        endPos: Number(page.endKey),
        startOffset: page.startOffset,
        endOffset: page.endOffset,
    }));

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
