import {
    buildPageMark,
    type EditorSettings,
    type HeaderFooterAlignment,
    type HeaderFooterCellSettings,
    type HeaderFooterRowSettings,
    resolveDraftDate,
    resolveHeaderFooterText,
} from '@stagistic/script';

import type {ExportPlan} from '../plan';
import type {
    PageItem, VisualLine, VisualRun,
} from '../visualLine';
import {
    CHAR_WIDTH_EM, HEADER_FOOTER_ALIGNMENTS, HEADER_FOOTER_MAX_WIDTH_RATIO, MONO_FONT_FAMILY, PAGE_BREAK_ITEM, type ScriptPage,
} from './model';

const makeHeaderFooterRun = (text: string, x: number, cell: HeaderFooterCellSettings, fontSizePx: number): VisualRun => ({
    text,
    x,
    fontSizePx,
    bold: cell.isBold,
    italic: cell.isItalic,
    underline: cell.isUnderline,
    fontFamily: MONO_FONT_FAMILY,
});

const resolveHeaderFooterX = ({
    alignment,
    text,
    settings,
    fontSizePx,
}: {
    alignment: HeaderFooterAlignment,
    text: string,
    settings: EditorSettings,
    fontSizePx: number,
}) => {
    const charWidthPx = fontSizePx * CHAR_WIDTH_EM;
    const textWidthPx = text.length * charWidthPx;
    const contentWidthPx = settings.page.widthPx - settings.page.marginLeftPx - settings.page.marginRightPx;
    const maxWidthPx = contentWidthPx * HEADER_FOOTER_MAX_WIDTH_RATIO;
    const clampedWidthPx = Math.min(textWidthPx, maxWidthPx);

    if (alignment === 'center') {
        return settings.page.marginLeftPx + (contentWidthPx - clampedWidthPx) / 2;
    }

    if (alignment === 'right') {
        return settings.page.widthPx - settings.page.marginRightPx - clampedWidthPx;
    }

    return settings.page.marginLeftPx;
};

const shouldRenderInsertedBlankCell = (area: 'header' | 'footer', cell: HeaderFooterCellSettings): boolean => {
    return area === 'footer' && cell.text.includes('{{page_number}}');
};

const buildHeaderFooterLine = ({
    area,
    row,
    y,
    page,
    pageNumber,
    pageMarkNumber,
    draftDate,
    plan,
    settings,
}: {
    area: 'header' | 'footer',
    row: HeaderFooterRowSettings,
    y: number,
    page: ScriptPage,
    pageNumber: number,
    pageMarkNumber: number,
    draftDate: string,
    plan: ExportPlan,
    settings: EditorSettings,
}): VisualLine | null => {
    const mark = page.mark ?? {actIndex: null, sceneNumber: 0};
    const pageMark = page.isInsertedBlank
        ? ''
        : buildPageMark({
            actIndex: mark.actIndex,
            sceneNumber: mark.sceneNumber,
            pageNumber: pageMarkNumber,
        });
    const runs = HEADER_FOOTER_ALIGNMENTS.flatMap(alignment => {
        const cell = row[alignment];

        if (page.isInsertedBlank && !shouldRenderInsertedBlankCell(area, cell)) {
            return [];
        }

        const text = resolveHeaderFooterText(cell.text, {
            scriptTitle: plan.scriptTitle,
            draftDate,
            pageMark,
            pageNumber,
        });

        if (text.length === 0) {
            return [];
        }

        const fontSizePx = settings.typography.fontSizePx;
        const x = resolveHeaderFooterX({
            alignment,
            text,
            settings,
            fontSizePx,
        });

        return [makeHeaderFooterRun(text, x, cell, fontSizePx)];
    });

    return runs.length > 0 ? {y, runs} : null;
};

export const withHeaderFooter = (pages: ScriptPage[], plan: ExportPlan, settings: EditorSettings): PageItem[] => {
    const fontSizePx = settings.typography.fontSizePx;
    const lineHeightPx = fontSizePx * settings.typography.lineHeight;
    const headerY = Math.max(0, (settings.page.marginTopPx - lineHeightPx) / 2);
    const footerY = settings.page.heightPx - settings.page.marginBottomPx + Math.max(0, (settings.page.marginBottomPx - lineHeightPx) / 2);
    const draftDate = plan.titlePage ? resolveDraftDate(plan.titlePage) : '';
    let pageMarkNumber = 0;

    return pages.flatMap((page, index) => {
        const pageNumber = page.referencePageNumber ?? index + 1;

        if (!page.isInsertedBlank) {
            pageMarkNumber += 1;
        }

        const header = buildHeaderFooterLine({
            area: 'header',
            row: settings.headerFooter.header,
            y: headerY,
            page,
            pageNumber,
            pageMarkNumber: page.referencePageMarkNumber ?? pageMarkNumber,
            draftDate,
            plan,
            settings,
        });
        const footer = buildHeaderFooterLine({
            area: 'footer',
            row: settings.headerFooter.footer,
            y: footerY,
            page,
            pageNumber,
            pageMarkNumber: page.referencePageMarkNumber ?? pageMarkNumber,
            draftDate,
            plan,
            settings,
        });
        const pageItems: PageItem[] = [
            ...header ? [header] : [],
            ...page.items,
            ...footer ? [footer] : [],
        ];

        return index === pages.length - 1 ? pageItems : [...pageItems, PAGE_BREAK_ITEM];
    });
};

export const getIntegratedFooter = (plan: ExportPlan, settings: EditorSettings) => {
    if (plan.postSteps.length === 0) {
        return undefined;
    }

    const fontSizePx = settings.typography.fontSizePx;
    const lineHeightPx = fontSizePx * settings.typography.lineHeight;
    const yPx = settings.page.heightPx - settings.page.marginBottomPx + Math.max(0, (settings.page.marginBottomPx - lineHeightPx) / 2);

    return HEADER_FOOTER_ALIGNMENTS.flatMap(alignment => {
        const cell = settings.headerFooter.footer[alignment];

        if (!cell.text.includes('{{page_number}}')) {
            return [];
        }

        return [
            {
                alignment,
                text: cell.text,
                yPx,
                fontSizePx,
                bold: cell.isBold,
                italic: cell.isItalic,
                underline: cell.isUnderline,
            },
        ];
    })[0];
};
