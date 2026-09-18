import type {EditorSettings} from '@stagistic/script';

export const MONO_FONT_FAMILY = 'Courier Prime';
export const CHAR_WIDTH_EM = 0.6;
export const HEADING_FONT_SCALE = 1.1;
export const SMALL_FONT_SCALE = 0.85;
export const SCRIPT_COLUMN_HEADER = 'script';
export const SCORE_COLUMN_HEADER = 'score';

const COLUMN_MIN_CHARS = 4;
const COLUMN_GUTTER_CHARS = 3;

export interface ContentsGeometry {
    pageWidthPx: number,
    contentLeftPx: number,
    contentRightPx: number,
    contentTopPx: number,
    contentBottomPx: number,
    bodyFontSizePx: number,
    bodyLineHeightPx: number,
    bodyCharWidthPx: number,
    smallFontSizePx: number,
    smallCharWidthPx: number,
    headingFontSizePx: number,
    headingLineHeightPx: number,
    /** Right edge of the script page-number column. */
    scriptRightPx: number,
    /** Right edge of the score column, or null when it is hidden. */
    scoreRightPx: number | null,
    /** Right edge available to entry titles. */
    titleRightPx: number,
}

/**
 * Column widths come from the header text, never from the values, so the title
 * column — and therefore wrapping and the page count — stay independent of the
 * actual page numbers.
 */
export const createContentsGeometry = (
    settings: EditorSettings,
    showScoreColumn: boolean,
): ContentsGeometry => {
    const bodyFontSizePx = settings.typography.fontSizePx;
    const bodyCharWidthPx = bodyFontSizePx * CHAR_WIDTH_EM;
    const smallFontSizePx = bodyFontSizePx * SMALL_FONT_SCALE;
    const headingFontSizePx = bodyFontSizePx * HEADING_FONT_SCALE;
    const contentRightPx = settings.page.widthPx - settings.page.marginRightPx;
    const scriptColumnPx = Math.max(COLUMN_MIN_CHARS, SCRIPT_COLUMN_HEADER.length) * bodyCharWidthPx;
    const scoreColumnPx = Math.max(COLUMN_MIN_CHARS, SCORE_COLUMN_HEADER.length) * bodyCharWidthPx;
    const gutterPx = COLUMN_GUTTER_CHARS * bodyCharWidthPx;
    const scoreRightPx = showScoreColumn ? contentRightPx : null;
    const scriptRightPx = showScoreColumn
        ? contentRightPx - scoreColumnPx - gutterPx
        : contentRightPx;

    return {
        pageWidthPx: settings.page.widthPx,
        contentLeftPx: settings.page.marginLeftPx,
        contentRightPx,
        contentTopPx: settings.page.marginTopPx,
        contentBottomPx: settings.page.heightPx - settings.page.marginBottomPx,
        bodyFontSizePx,
        bodyLineHeightPx: bodyFontSizePx * settings.typography.lineHeight,
        bodyCharWidthPx,
        smallFontSizePx,
        smallCharWidthPx: smallFontSizePx * CHAR_WIDTH_EM,
        headingFontSizePx,
        headingLineHeightPx: headingFontSizePx * settings.typography.lineHeight,
        scriptRightPx,
        scoreRightPx,
        titleRightPx: scriptRightPx - scriptColumnPx - gutterPx,
    };
};
