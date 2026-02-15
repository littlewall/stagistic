import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {type DecorationSet} from '@tiptap/pm/view';

export type PageInfo = {
    index: number,
    startPos: number,
    endPos: number,
    startOffset: number,
    endOffset: number,
};

export type PaginationState = {
    pageCount: number,
    pages: PageInfo[],
    pageHeight: number,
    contentHeight: number,
    lineHeightPx: number,
    marginTop: number,
    marginBottom: number,
    marginLeft: number,
    marginRight: number,
};

export type PaginationPluginState = {
    decorations: DecorationSet,
    pagination: PaginationState,
};

export type PaginationOptions = {
    pageHeight: number,
    pageWidth: number,
    marginTop: number,
    marginBottom: number,
    marginLeft: number,
    marginRight: number,
    lineHeightPx: number,
    dividerColor: string,
    dividerThickness: number,
};

export type PaginationStorage = {
    optionsVersion: number,
    state: PaginationState,
};

export type BlockCacheEntry = {
    node: ProseMirrorNode,
    height: number,
    isFallback: boolean,
    hasInlineBreaks: boolean,
};

export type SpacerOverlay = {
    moreText?: string,
    contdText?: string,
};

export type BuildPaginationStateResult = {
    decorations: DecorationSet,
    pagination: PaginationState,
    nextCache: Map<string, BlockCacheEntry>,
    hasInlineBreaks: boolean,
    usedFallbackMeasurements: boolean,
};

export type PaginationExtensionAdapter = {
    options: PaginationOptions,
    storage: PaginationStorage,
};
