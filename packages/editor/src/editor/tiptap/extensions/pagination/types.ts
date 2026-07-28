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
    /** False until the first real (measured) recalc has been dispatched. */
    hasComputed: boolean,
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
    options: PaginationOptions,
    optionsVersion: number,
    state: PaginationState,
    forceRecalcToken: number,
}

export interface BlockLine {
    /** ProseMirror position of the first content on this visual line */
    startPos: number,
    /** line top relative to the block's border-box top (includes padding-top) */
    topRel: number,
}

export interface BlockLineMap {
    lines: BlockLine[],
    /** block height measured with inline-break spacers hidden */
    cleanHeight: number,
}

export interface BlockCacheEntry {
    node: ProseMirrorNode,
    height: number,
    isFallback: boolean,
    hasInlineBreaks: boolean,
}

export interface BuildPaginationStateResult {
    decorations: DecorationSet,
    pagination: PaginationState,
    nextCache: Map<string, BlockCacheEntry>,
    hasInlineBreaks: boolean,
    usedFallbackMeasurements: boolean,
}
