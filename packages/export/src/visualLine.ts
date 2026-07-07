export interface VisualRun {
    text: string,
    x: number,
    fontSizePx: number,
    bold: boolean,
    italic: boolean,
    underline: boolean,
    fontFamily: string,
}

export interface VisualLine {
    y: number,
    runs: VisualRun[],
}

export type PageItem = VisualLine | {type: '__page_break__'};

export interface TranscriptResult {
    pageWidthPx: number,
    pageHeightPx: number,
    marginLeftPx: number,
    marginTopPx: number,
    items: PageItem[],
}
