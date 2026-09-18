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

export interface StaffRowItem {
    type: 'staff-row',
    label: {
        text: string, x: number, y: number, fontSizePx: number,
    },
    staff: {
        xPx: number,
        widthPx: number,
        /** Y coordinate of staff position 0 (the bottom line). */
        baselineY: number,
        /** Px per half staff-space; staff lines sit at positions 0,2,4,6,8 above baselineY. */
        unitPx: number,
        clef: 'treble' | 'treble-8vb',
        notes: Array<{
            position: number, alter: -1 | 0 | 1, ledgerPositions: number[], xFraction: number,
        }>,
    },
}

export type PageItem = VisualLine | StaffRowItem | {type: '__page_break__'};

/** A page of leading-matter items where staff rows and plain text lines can mix (e.g. Vocal Ranges alongside Contents). */
export type InitialPageVisualPage = Array<VisualLine | StaffRowItem>;

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
