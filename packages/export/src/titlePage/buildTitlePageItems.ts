import {
    type EditorSettings,
    resolveDraftDate,
    type TitlePageCredit,
    type TitlePageSettings,
} from '@stagistic/script';

import type {
    VisualLine,
    VisualRun,
} from '../visualLine';

/*
 * The title page reuses the same embedded mono font as the script body:
 * Courier Prime covers Latin + diacritics, which the jsPDF core fonts (WinAnsi)
 * do not. The family string must contain "Courier" so drawPdf picks the
 * embedded TTF rather than core Courier.
 */
const MONO_FONT_FAMILY = 'Courier Prime';
const CHAR_WIDTH_EM = 0.6;
const TITLE_FONT_SCALE = 1.4;

/*
 * Vertical anchors as fractions of the page height, mirroring NMI Format
 * Guidelines 2024 p.73: title in the upper third, credits around the middle,
 * contact / draft date / copyright floating in the lower portion.
 */
const TITLE_Y_RATIO = 0.28;
const CREDITS_Y_RATIO = 0.44;
const CONTACT_Y_RATIO = 0.64;
const DRAFT_DATE_Y_RATIO = 0.74;
const COPYRIGHT_Y_RATIO = 0.88;

const UNTITLED = 'Untitled';

type Emphasis = {bold?: boolean, italic?: boolean};

interface Geometry {
    pageWidthPx: number,
    marginLeftPx: number,
    marginRightPx: number,
    fontSizePx: number,
    lineHeightPx: number,
}

const charWidthFor = (fontSizePx: number) => fontSizePx * CHAR_WIDTH_EM;

const makeRun = (
    text: string,
    x: number,
    fontSizePx: number,
    emphasis: Emphasis,
): VisualRun => ({
    text,
    x,
    fontSizePx,
    bold: emphasis.bold ?? false,
    italic: emphasis.italic ?? false,
    underline: false,
    fontFamily: MONO_FONT_FAMILY,
});

const centeredLine = (
    geometry: Geometry,
    text: string,
    y: number,
    fontSizePx: number,
    emphasis: Emphasis = {},
): VisualLine => {
    const textWidthPx = text.length * charWidthFor(fontSizePx);
    const x = (geometry.pageWidthPx - textWidthPx) / 2;

    return {y, runs: [makeRun(text, x, fontSizePx, emphasis)]};
};

const leftLine = (
    geometry: Geometry,
    text: string,
    y: number,
    emphasis: Emphasis = {},
): VisualLine => ({
    y,
    runs: [makeRun(text, geometry.marginLeftPx, geometry.fontSizePx, emphasis)],
});

const rightLine = (
    geometry: Geometry,
    text: string,
    y: number,
    emphasis: Emphasis = {},
): VisualLine => {
    const textWidthPx = text.length * charWidthFor(geometry.fontSizePx);
    const x = geometry.pageWidthPx - geometry.marginRightPx - textWidthPx;

    return {y, runs: [makeRun(text, x, geometry.fontSizePx, emphasis)]};
};

const formatCreditLine = (credit: TitlePageCredit): string => {
    const label = credit.credit.trim();
    const authors = credit.authors.map(author => author.trim()).filter(author => author.length > 0).join(', ');

    return [label, authors].filter(part => part.length > 0).join(' ');
};

/**
 * Renders the title page (NMI p.73 layout) as absolutely-positioned visual
 * lines in the same coordinate space as the script transcript. Always emits at
 * least the title; the caller appends the page break.
 */
export const buildTitlePageItems = (
    titlePage: TitlePageSettings | null,
    scriptTitle: string,
    settings: EditorSettings,
): VisualLine[] => {
    const pageHeightPx = settings.page.heightPx;
    const fontSizePx = settings.typography.fontSizePx;
    const geometry: Geometry = {
        pageWidthPx: settings.page.widthPx,
        marginLeftPx: settings.page.marginLeftPx,
        marginRightPx: settings.page.marginRightPx,
        fontSizePx,
        lineHeightPx: fontSizePx * settings.typography.lineHeight,
    };

    const lines: VisualLine[] = [];

    const titleFontSizePx = fontSizePx * TITLE_FONT_SCALE;
    const title = scriptTitle.trim().length > 0 ? scriptTitle.trim() : UNTITLED;
    let titleY = pageHeightPx * TITLE_Y_RATIO;

    lines.push(centeredLine(geometry, title, titleY, titleFontSizePx, {bold: true}));

    const subtitle = titlePage?.subtitle?.trim();

    if (subtitle) {
        titleY += titleFontSizePx * settings.typography.lineHeight;
        lines.push(centeredLine(geometry, subtitle, titleY, fontSizePx));
    }

    const creditLines = (titlePage?.credits ?? [])
        .map(formatCreditLine)
        .filter(line => line.length > 0);
    let creditsY = pageHeightPx * CREDITS_Y_RATIO;

    creditLines.forEach(line => {
        lines.push(centeredLine(geometry, line, creditsY, fontSizePx));
        creditsY += geometry.lineHeightPx;
    });

    const source = titlePage?.source?.trim();

    if (source) {
        lines.push(centeredLine(geometry, source, creditsY + geometry.lineHeightPx * 0.5, fontSizePx, {italic: true}));
    }

    const contactLines = (titlePage?.contact ?? '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    let contactY = pageHeightPx * CONTACT_Y_RATIO;

    contactLines.forEach(line => {
        lines.push(rightLine(geometry, line, contactY, {italic: true}));
        contactY += geometry.lineHeightPx;
    });

    const draftDate = titlePage ? resolveDraftDate(titlePage) : '';

    if (draftDate.length > 0) {
        lines.push(leftLine(geometry, draftDate, pageHeightPx * DRAFT_DATE_Y_RATIO));
    }

    const copyright = titlePage?.copyright?.trim();

    if (copyright) {
        lines.push(centeredLine(geometry, copyright, pageHeightPx * COPYRIGHT_Y_RATIO, fontSizePx));
    }

    return lines;
};
