import {
    DEFAULT_EDITOR_SETTINGS,
    type EditorSettings,
    type EditorSettingsOverride,
    mergeEditorSettings,
} from '@stagistic/script';

const MIN_PAGE_WIDTH_PX = 480;
const MAX_PAGE_WIDTH_PX = 2000;
const MIN_PAGE_HEIGHT_PX = 640;
const MAX_PAGE_HEIGHT_PX = 4000;
const MIN_PAGE_CONTENT_WIDTH_PX = 320;
const MIN_PAGE_CONTENT_HEIGHT_PX = 240;
const MAX_PAGE_GAP_PX = 240;
const MAX_CONTENT_MARGIN_PX = 400;
const MIN_PAGE_MARGIN_HORIZONTAL_PX = 48; // 0.5"
const MIN_FONT_SIZE_PX = 10;
const MAX_FONT_SIZE_PX = 36;
const MIN_LINE_HEIGHT = 0.8;
const MAX_LINE_HEIGHT = 2.2;

const clamp = (value: number, min: number, max: number) => {
    return Math.min(max, Math.max(min, value));
};

const toFiniteNumber = (value: unknown, fallback: number) => {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const sanitizeResolvedSettings = (settings: EditorSettings): EditorSettings => {
    const defaultPage = DEFAULT_EDITOR_SETTINGS.page;
    const defaultTypography = DEFAULT_EDITOR_SETTINGS.typography;
    const pageWidth = clamp(
        toFiniteNumber(settings.page.widthPx, defaultPage.widthPx),
        MIN_PAGE_WIDTH_PX,
        MAX_PAGE_WIDTH_PX,
    );
    const pageHeight = clamp(
        toFiniteNumber(settings.page.heightPx, defaultPage.heightPx),
        MIN_PAGE_HEIGHT_PX,
        MAX_PAGE_HEIGHT_PX,
    );
    const maxHorizontalMarginsTotal = Math.max(0, pageWidth - MIN_PAGE_CONTENT_WIDTH_PX);
    const maxVerticalMarginsTotal = Math.max(0, pageHeight - MIN_PAGE_CONTENT_HEIGHT_PX);
    let marginLeft = clamp(
        toFiniteNumber(settings.page.marginLeftPx, defaultPage.marginLeftPx),
        MIN_PAGE_MARGIN_HORIZONTAL_PX,
        pageWidth,
    );
    let marginRight = clamp(
        toFiniteNumber(settings.page.marginRightPx, defaultPage.marginRightPx),
        MIN_PAGE_MARGIN_HORIZONTAL_PX,
        pageWidth,
    );
    let marginTop = clamp(
        toFiniteNumber(settings.page.marginTopPx, defaultPage.marginTopPx),
        0,
        pageHeight,
    );
    let marginBottom = clamp(
        toFiniteNumber(settings.page.marginBottomPx, defaultPage.marginBottomPx),
        0,
        pageHeight,
    );

    const horizontalMarginsTotal = marginLeft + marginRight;

    if (horizontalMarginsTotal > maxHorizontalMarginsTotal && horizontalMarginsTotal > 0) {
        const ratio = maxHorizontalMarginsTotal / horizontalMarginsTotal;

        marginLeft = Math.floor(marginLeft * ratio);
        marginRight = Math.floor(marginRight * ratio);
    }

    const verticalMarginsTotal = marginTop + marginBottom;

    if (verticalMarginsTotal > maxVerticalMarginsTotal && verticalMarginsTotal > 0) {
        const ratio = maxVerticalMarginsTotal / verticalMarginsTotal;

        marginTop = Math.floor(marginTop * ratio);
        marginBottom = Math.floor(marginBottom * ratio);
    }

    const pageGapPx = clamp(
        toFiniteNumber(settings.page.pageGapPx, defaultPage.pageGapPx),
        0,
        MAX_PAGE_GAP_PX,
    );
    const contentMarginTopPx = clamp(
        toFiniteNumber(settings.page.contentMarginTopPx, defaultPage.contentMarginTopPx ?? 0),
        0,
        MAX_CONTENT_MARGIN_PX,
    );
    const contentMarginBottomPx = clamp(
        toFiniteNumber(settings.page.contentMarginBottomPx, defaultPage.contentMarginBottomPx ?? 0),
        0,
        MAX_CONTENT_MARGIN_PX,
    );
    const pageBreakBackground = typeof settings.page.pageBreakBackground === 'string'
        ? settings.page.pageBreakBackground
        : defaultPage.pageBreakBackground;
    const fontSizePx = clamp(
        toFiniteNumber(settings.typography.fontSizePx, defaultTypography.fontSizePx),
        MIN_FONT_SIZE_PX,
        MAX_FONT_SIZE_PX,
    );
    const lineHeight = clamp(
        toFiniteNumber(settings.typography.lineHeight, defaultTypography.lineHeight),
        MIN_LINE_HEIGHT,
        MAX_LINE_HEIGHT,
    );

    return {
        ...settings,
        page: {
            ...settings.page,
            widthPx: pageWidth,
            heightPx: pageHeight,
            marginTopPx: marginTop,
            marginRightPx: marginRight,
            marginBottomPx: marginBottom,
            marginLeftPx: marginLeft,
            pageGapPx,
            pageBreakBackground,
            contentMarginTopPx,
            contentMarginBottomPx,
        },
        typography: {
            ...settings.typography,
            fontSizePx,
            lineHeight,
        },
    };
};

export const resolveEditorSettings = (
    globalOverrides?: EditorSettingsOverride,
    scriptOverrides?: EditorSettingsOverride,
): EditorSettings => sanitizeResolvedSettings(mergeEditorSettings(
    DEFAULT_EDITOR_SETTINGS,
    globalOverrides,
    scriptOverrides,
));
