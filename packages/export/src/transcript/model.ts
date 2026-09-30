import {type EditorSettings, type HeaderFooterAlignment} from '@stagistic/script';

import type {PageItem, VisualLine} from '../visualLine';

export const PAGE_BREAK_ITEM: PageItem = {type: '__page_break__'};
export const MONO_FONT_FAMILY = 'Courier Prime';
export const DEFAULT_BLOCK_TYPE = 'stageDirection';
export const CHAR_WIDTH_EM = 0.6;
export const HEADER_FOOTER_MAX_WIDTH_RATIO = 0.4;
export const HEADER_FOOTER_ALIGNMENTS: HeaderFooterAlignment[] = [
    'left',
    'center',
    'right',
];

export interface MusicLabels {
    numberByMusicId: Map<string, string>,
}

export interface InlineStyle {
    bold?: boolean,
    italic?: boolean,
    underline?: boolean,
    characterTag?: boolean,
    /*
     * Forces underline off regardless of the block's underline setting, so the
     * scene-number label stays un-underlined like the editor's `::before` marker.
     */
    noUnderline?: boolean,
}

export interface TextSegment {
    text: string,
    style: InlineStyle,
}

export interface WrappedLine {
    text: string,
    segments: TextSegment[],
}

export interface TextWord {
    segments: TextSegment[],
    spaceStyle: InlineStyle,
}

export interface PreparedBlock {
    blockType: string,
    block: NonNullable<EditorSettings['blocks'][string]>,
    fontSizePx: number,
    lineHeightPx: number,
    spacingBeforePx: number,
    spacingAfterPx: number,
    baseX: number,
    availableWidthPx: number,
    charWidthPx: number,
    wrapped: WrappedLine[],
}

export interface PageStructureMark {
    actIndex: number | null,
    sceneNumber: number,
}

export interface ScriptPage {
    items: VisualLine[],
    mark: PageStructureMark | null,
    isInsertedBlank: boolean,
    sourceBlockIds: Set<string>,
    referencePageNumber?: number,
    referencePageMarkNumber?: number,
}
