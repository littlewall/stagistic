import {buildDefaultBlockSettings} from '../blocks/derived/defaultBlockSettings';
import {CHARACTER_COLOR_SATURATION_DEFAULT} from './options';
import type {
    EditorSettings,
    HeaderFooterAlignment,
    HeaderFooterCellSettings,
} from './types';

const buildHeaderFooterCell = (
    overrides: Partial<HeaderFooterCellSettings> = {},
): HeaderFooterCellSettings => ({
    text: '', isBold: false, isItalic: false, isUnderline: false, isHiddenInEditor: false, ...overrides,
});

const buildHeaderFooterRow = (
    cells: Partial<Record<HeaderFooterAlignment, Partial<HeaderFooterCellSettings>>> = {},
) => ({
    left: buildHeaderFooterCell(cells.left),
    center: buildHeaderFooterCell(cells.center),
    right: buildHeaderFooterCell(cells.right),
});

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
    page: {
        widthPx: 794,
        heightPx: 1123,
        marginTopPx: 96,
        marginRightPx: 96,
        marginBottomPx: 96,
        marginLeftPx: 144,
        pageGapPx: 32,
        pageBreakBackground: 'var(--color-surface)',
        contentMarginTopPx: 0,
        contentMarginBottomPx: 0,
    },
    typography: {
        fontSizePx: 16,
        lineHeight: 1.2,
    },
    visual: {
        characterColorSaturation: CHARACTER_COLOR_SATURATION_DEFAULT,
    },
    structure: {
        actDisplay: {
            linesBefore: 1,
            linesAfter: 1,
        },
    },
    headerFooter: {
        /*
         * Top-right page mark and bottom-center integrated page number are fixed cells:
         * only their style and editor visibility are user-configurable.
         */
        header: buildHeaderFooterRow({right: {text: '{{page}}', isHiddenInEditor: true}}),
        footer: buildHeaderFooterRow({center: {text: '{{page_number}}', isBold: true}}),
    },
    blocks: buildDefaultBlockSettings(),
};
