import {
    type Decoration,
    DecorationSet,
    type EditorView,
} from '@tiptap/pm/view';

import type {
    BlockCacheEntry,
    BuildPaginationStateResult,
    PaginationOptions,
    PaginationState,
} from '../types';

type SharedResultArgs = {
    options: PaginationOptions,
    contentHeight: number,
    fallbackHeight: number,
    nextCache: Map<string, BlockCacheEntry>,
    hasInlineBreaks: boolean,
    usedFallbackMeasurements: boolean,
};

export const buildEmptyPaginationStateResult = ({
    options,
    contentHeight,
    fallbackHeight,
    nextCache,
    hasInlineBreaks,
    usedFallbackMeasurements,
}: SharedResultArgs): BuildPaginationStateResult => {
    return {
        decorations: DecorationSet.empty,
        pagination: {
            pageCount: 1,
            pages: [],
            pageHeight: options.pageHeight,
            contentHeight,
            lineHeightPx: fallbackHeight,
            marginTop: options.marginTop,
            marginBottom: options.marginBottom,
            marginLeft: options.marginLeft,
            marginRight: options.marginRight,
        },
        nextCache,
        hasInlineBreaks,
        usedFallbackMeasurements,
    };
};

type BuildFinalPaginationStateResultArgs = SharedResultArgs & {
    view: EditorView,
    decorations: Decoration[],
    pages: PaginationState['pages'],
};

export const buildFinalPaginationStateResult = ({
    view,
    decorations,
    pages,
    options,
    contentHeight,
    fallbackHeight,
    nextCache,
    hasInlineBreaks,
    usedFallbackMeasurements,
}: BuildFinalPaginationStateResultArgs): BuildPaginationStateResult => {
    return {
        decorations: DecorationSet.create(view.state.doc, decorations),
        pagination: {
            pageCount: pages.length,
            pages,
            pageHeight: options.pageHeight,
            contentHeight,
            lineHeightPx: fallbackHeight,
            marginTop: options.marginTop,
            marginBottom: options.marginBottom,
            marginLeft: options.marginLeft,
            marginRight: options.marginRight,
        },
        nextCache,
        hasInlineBreaks,
        usedFallbackMeasurements,
    };
};
