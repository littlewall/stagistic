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
    sourceBlockId?: string,
}

export type PageItem = VisualLine | {type: '__page_break__'};

export interface TranscriptResult {
    pageWidthPx: number,
    pageHeightPx: number,
    marginLeftPx: number,
    marginRightPx: number,
    marginTopPx: number,
    items: PageItem[],
    /** Source ownership for generated script pages; leading pages come first. */
    leadingPageCount?: number,
    scriptPageSourceBlockIds?: string[][],
    integratedScores?: Array<{
        musicId: string,
        title: string,
        startBlockId: string,
        afterBlockId: string,
    }>,
    scorePdfs?: Record<string, ArrayBuffer>,
    integratedFooter?: {
        alignment: 'left' | 'center' | 'right',
        text: string,
        yPx: number,
        fontSizePx: number,
        bold: boolean,
        italic: boolean,
        underline: boolean,
    },
}
