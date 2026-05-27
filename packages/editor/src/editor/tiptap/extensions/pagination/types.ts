import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {type DecorationSet} from '@tiptap/pm/view';

export interface PageInfo {
    index: number,
    startPos: number,
    endPos: number,
    startOffset: number,
    endOffset: number,
}

export interface PaginationState {
    pageCount: number,
    pages: PageInfo[],
    pageHeight: number,
    contentHeight: number,
    lineHeightPx: number,
    marginTop: number,
    marginBottom: number,
    marginLeft: number,
    marginRight: number,
}

export interface PaginationPluginState {
    decorations: DecorationSet,
    pagination: PaginationState,
    forceRecalcToken: number,
}

export interface PaginationOptions {
    pageHeight: number,
    pageWidth: number,
    marginTop: number,
    marginBottom: number,
    marginLeft: number,
    marginRight: number,
    lineHeightPx: number,
    dividerColor: string,
    dividerThickness: number,
    dividerInsetPx: number,
}

export interface PaginationStorage {
    optionsVersion: number,
    state: PaginationState,
    forceRecalcToken: number,
}

export interface BlockCacheEntry {
    node: ProseMirrorNode,
    height: number,
    isFallback: boolean,
    hasInlineBreaks: boolean,
}

export interface SpacerOverlay {
    moreText?: string,
    contdText?: string,
}

export interface BuildPaginationStateResult {
    decorations: DecorationSet,
    pagination: PaginationState,
    nextCache: Map<string, BlockCacheEntry>,
    hasInlineBreaks: boolean,
    usedFallbackMeasurements: boolean,
}

export interface PaginationExtensionAdapter {
    options: PaginationOptions,
    storage: PaginationStorage,
}
