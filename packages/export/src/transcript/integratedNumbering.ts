import {type EditorSettings, resolveDraftDate} from '@stagistic/script';

import type {ExportPlan} from '../model/plan';
import {HEADER_FOOTER_ALIGNMENTS} from './model';

export const hasContinuousPageNumber = (settings: EditorSettings) => [...Object.values(settings.headerFooter.header), ...Object.values(settings.headerFooter.footer)].some(cell => cell.text.includes('{{page_number}}'));

export const withIntegratedNumberingSpace = (settings: EditorSettings): EditorSettings => {
    const fontSize = settings.typography.fontSizePx;
    const lineHeight = fontSize * settings.typography.lineHeight;
    const extraFooterRow = !hasContinuousPageNumber(settings) && Object.values(settings.headerFooter.footer).some(cell => cell.text.trim());
    const marginBottomPx = Math.max(settings.page.marginBottomPx, fontSize * 2 + (extraFooterRow ? lineHeight * 2 : 0));

    return {...settings, page: {...settings.page, marginBottomPx}};
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
                marginLeftPx: settings.page.marginLeftPx,
                marginRightPx: settings.page.marginRightPx,
                text: cell.text
                    .replaceAll('{{script_title}}', plan.scriptTitle || 'Untitled')
                    .replaceAll('{{draft_date}}', plan.titlePage ? resolveDraftDate(plan.titlePage) : '')
                    .replaceAll('{{page}}', ''),
                yPx,
                fontSizePx,
                bold: cell.isBold,
                italic: cell.isItalic,
                underline: cell.isUnderline,
            },
        ];
    })[0] ?? {
        alignment: 'center' as const,
        marginLeftPx: 0,
        marginRightPx: 0,
        text: '{{page_number}}',
        yPx: settings.page.heightPx - fontSizePx * 1.5,
        fontSizePx,
        bold: false,
        italic: false,
        underline: false,
    };
};
