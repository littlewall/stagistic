import {
    type EditorSettings,
    ledgerPositions,
    parsePitch,
    pickClef,
    staffPosition,
} from '@stagistic/script';

import type {VocalRangesInitialPagePlan} from '../plan';
import type {
    InitialPageVisualPage,
    StaffRowItem,
    VisualLine,
    VisualRun,
} from '../visualLine';

const MONO_FONT_FAMILY = 'Courier Prime';
const CHAR_WIDTH_EM = 0.6;
const HEADING_FONT_SCALE = 1.1;
const HEADING = 'VOCAL RANGES';
/** Staff half-space unit, relative to the body font size. */
const STAFF_UNIT_SCALE = 0.25;
/** Rows above/below the 5-line staff reserved for ledger lines. */
const STAFF_LEDGER_MARGIN_UNITS = 5;
const ROW_GAP_SCALE = 0.625;
const LABEL_WIDTH_FRACTION = 0.4;
const LOW_NOTE_X_FRACTION = 0.15;
const HIGH_NOTE_X_FRACTION = 0.8;

interface Geometry {
    pageWidthPx: number,
    contentLeftPx: number,
    contentRightPx: number,
    contentTopPx: number,
    contentBottomPx: number,
    bodyFontSizePx: number,
    bodyLineHeightPx: number,
    headingFontSizePx: number,
    headingLineHeightPx: number,
    unitPx: number,
    rowHeightPx: number,
    rowGapPx: number,
}

const createGeometry = (settings: EditorSettings): Geometry => {
    const bodyFontSizePx = settings.typography.fontSizePx;
    const headingFontSizePx = bodyFontSizePx * HEADING_FONT_SCALE;
    const unitPx = bodyFontSizePx * STAFF_UNIT_SCALE;

    return {
        pageWidthPx: settings.page.widthPx,
        contentLeftPx: settings.page.marginLeftPx,
        contentRightPx: settings.page.widthPx - settings.page.marginRightPx,
        contentTopPx: settings.page.marginTopPx,
        contentBottomPx: settings.page.heightPx - settings.page.marginBottomPx,
        bodyFontSizePx,
        bodyLineHeightPx: bodyFontSizePx * settings.typography.lineHeight,
        headingFontSizePx,
        headingLineHeightPx: headingFontSizePx * settings.typography.lineHeight,
        unitPx,
        rowHeightPx: unitPx * (8 + STAFF_LEDGER_MARGIN_UNITS * 2),
        rowGapPx: bodyFontSizePx * settings.typography.lineHeight * ROW_GAP_SCALE,
    };
};

const makeRun = (
    text: string,
    x: number,
    fontSizePx: number,
    emphasis: {bold?: boolean, italic?: boolean} = {},
): VisualRun => ({
    text,
    x,
    fontSizePx,
    bold: emphasis.bold ?? false,
    italic: emphasis.italic ?? false,
    underline: false,
    fontFamily: MONO_FONT_FAMILY,
});

const buildHeading = (geometry: Geometry, y: number): VisualLine => ({
    y,
    runs: [
        makeRun(
            HEADING,
            (geometry.pageWidthPx - HEADING.length * geometry.headingFontSizePx * CHAR_WIDTH_EM) / 2,
            geometry.headingFontSizePx,
            {bold: true},
        ),
    ],
});

const buildRow = (
    geometry: Geometry,
    entry: VocalRangesInitialPagePlan['entries'][number],
    rowTopY: number,
): StaffRowItem | null => {
    const low = parsePitch(entry.low);
    const high = parsePitch(entry.high);

    if (!low || !high) {
        return null;
    }

    const clef = pickClef(low, high);
    const baselineY = rowTopY + geometry.unitPx * (STAFF_LEDGER_MARGIN_UNITS + 8);
    const staffX = geometry.contentLeftPx
        + (geometry.contentRightPx - geometry.contentLeftPx) * LABEL_WIDTH_FRACTION;
    const labelText = entry.voiceType
        ? `${entry.displayName} (${entry.voiceType})`
        : entry.displayName;

    return {
        type: 'staff-row',
        label: {
            text: labelText,
            x: geometry.contentLeftPx,
            y: baselineY - geometry.unitPx * 4 - geometry.bodyFontSizePx / 2,
            fontSizePx: geometry.bodyFontSizePx,
        },
        staff: {
            xPx: staffX,
            widthPx: geometry.contentRightPx - staffX,
            baselineY,
            unitPx: geometry.unitPx,
            clef,
            notes: [
                {
                    position: staffPosition(low, clef),
                    alter: low.alter,
                    ledgerPositions: ledgerPositions(staffPosition(low, clef)),
                    xFraction: LOW_NOTE_X_FRACTION,
                }, {
                    position: staffPosition(high, clef),
                    alter: high.alter,
                    ledgerPositions: ledgerPositions(staffPosition(high, clef)),
                    xFraction: HIGH_NOTE_X_FRACTION,
                },
            ],
        },
    };
};

export const buildVocalRangesPages = (
    plan: VocalRangesInitialPagePlan,
    settings: EditorSettings,
): InitialPageVisualPage[] => {
    if (plan.entries.length === 0) {
        return [];
    }

    const geometry = createGeometry(settings);
    const pages: InitialPageVisualPage[] = [];
    let current: InitialPageVisualPage = [];
    let y = geometry.contentTopPx;

    const startPage = () => {
        current = [buildHeading(geometry, geometry.contentTopPx)];
        pages.push(current);
        y = geometry.contentTopPx + geometry.headingLineHeightPx + geometry.bodyLineHeightPx;
    };

    startPage();

    plan.entries.forEach(entry => {
        if (y + geometry.rowHeightPx > geometry.contentBottomPx && current.length > 1) {
            startPage();
        }

        const row = buildRow(geometry, entry, y);

        if (!row) {
            return;
        }

        current.push(row);
        y += geometry.rowHeightPx + geometry.rowGapPx;
    });

    return pages;
};
