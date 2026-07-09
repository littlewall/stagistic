import {DEFAULT_EDITOR_SETTINGS} from '@stagistic/script';
import type {FormSelectOption} from '@stagistic/ui';
import {type CSSProperties, useMemo} from 'react';

import {
    MARGIN_ROW_OPTIONS,
    MIN_PAGE_MARGIN_HORIZONTAL_PX,
    PX_PER_INCH,
} from '../constants';
import {
    clamp,
    formatInches,
    getClosestStepValue,
} from '../math';
import type {ScriptEditorSettingsPanelProps} from '../types';

const MIN_PAGE_CONTENT_WIDTH_PX = 320;

export interface PageLayoutPreviewModel {
    pagePreviewStyle: CSSProperties,
    headerRows: number,
    footerRows: number,
    contentRows: number,
}

export interface PageLayoutSliderModel {
    sliderStyle: CSSProperties,
    sliderStart: number,
    sliderEnd: number,
    previewReferenceTotal: number,
    minSliderStart: number,
    maxSliderStart: number,
    minSliderEnd: number,
    maxSliderEnd: number,
    leftMarginInches: string,
    rightMarginInches: string,
    contentWidthInches: string,
}

export interface PageLayoutNumericModel {
    topMarginRows: number,
    bottomMarginRows: number,
    marginRowOptions: FormSelectOption[],
}

export interface PageLayoutViewModel {
    preview: PageLayoutPreviewModel,
    slider: PageLayoutSliderModel,
    numeric: PageLayoutNumericModel,
}

export const usePageLayoutSettingsViewModel = ({
    resolvedScriptSettings,
}: Pick<ScriptEditorSettingsPanelProps, 'resolvedScriptSettings'>): PageLayoutViewModel => {
    return useMemo(() => {
        const defaultPage = DEFAULT_EDITOR_SETTINGS.page;
        const pageWidthPx = resolvedScriptSettings.page.widthPx ?? defaultPage.widthPx;
        const pageHeightPx = resolvedScriptSettings.page.heightPx ?? defaultPage.heightPx;
        const marginLeftPx = resolvedScriptSettings.page.marginLeftPx ?? defaultPage.marginLeftPx;
        const marginRightPx = resolvedScriptSettings.page.marginRightPx ?? defaultPage.marginRightPx;
        const marginTopPx = resolvedScriptSettings.page.marginTopPx ?? defaultPage.marginTopPx;
        const marginBottomPx = resolvedScriptSettings.page.marginBottomPx ?? defaultPage.marginBottomPx;
        const contentMarginTopPx = resolvedScriptSettings.page.contentMarginTopPx ?? 0;
        const contentMarginBottomPx = resolvedScriptSettings.page.contentMarginBottomPx ?? 0;
        const fontSizePx = resolvedScriptSettings.typography.fontSizePx
            ?? DEFAULT_EDITOR_SETTINGS.typography.fontSizePx;
        const safeFontSize = Math.max(1, fontSizePx);

        const safeWidth = Math.max(1, pageWidthPx);

        // Schematic column widths and row heights driven by CSS vars
        const marginLeftPercent = clamp((marginLeftPx / safeWidth) * 100, 0, 50);
        const marginRightPercent = clamp((marginRightPx / safeWidth) * 100, 0, 50);

        const pseudoRowUnit = 4; // px per row in the schematic preview
        const topMarginRowsRaw = Math.max(1, Math.round(marginTopPx / safeFontSize));
        const bottomMarginRowsRaw = Math.max(1, Math.round(marginBottomPx / safeFontSize));

        const pagePreviewStyle = {
            '--page-margin-left-percent': `${marginLeftPercent}%`,
            '--page-margin-right-percent': `${marginRightPercent}%`,
            '--page-margin-top-height': `${topMarginRowsRaw * pseudoRowUnit}px`,
            '--page-margin-bottom-height': `${bottomMarginRowsRaw * pseudoRowUnit}px`,
        } as CSSProperties;

        // Schematic row labels
        const headerRows = Math.round(contentMarginTopPx / safeFontSize);
        const footerRows = Math.round(contentMarginBottomPx / safeFontSize);
        const contentRows = Math.round(
            Math.max(0, pageHeightPx - marginTopPx - marginBottomPx - contentMarginTopPx - contentMarginBottomPx)
            / safeFontSize,
        );

        // L/R margin slider
        const minStart = MIN_PAGE_MARGIN_HORIZONTAL_PX;
        const maxEnd = pageWidthPx - MIN_PAGE_MARGIN_HORIZONTAL_PX;
        const minEnd = minStart + MIN_PAGE_CONTENT_WIDTH_PX;
        const maxStart = maxEnd - MIN_PAGE_CONTENT_WIDTH_PX;

        const sliderStart = clamp(marginLeftPx, minStart, maxStart);
        const sliderEnd = clamp(pageWidthPx - marginRightPx, minEnd, maxEnd);

        const marginLeftIndentPercent = (sliderStart / safeWidth) * 100;
        const marginRightIndentPercent = (sliderEnd / safeWidth) * 100;
        const defaultStartPercent = (minStart / safeWidth) * 100;
        const defaultEndPercent = (maxEnd / safeWidth) * 100;

        const sliderStyle = {
            '--preview-indent-start-percent': `${marginLeftIndentPercent}%`,
            '--preview-indent-end-percent': `${marginRightIndentPercent}%`,
            '--preview-indent-default-start-percent': `${defaultStartPercent}%`,
            '--preview-indent-default-end-percent': `${defaultEndPercent}%`,
            '--preview-slider-zone-start-percent': '0%',
            '--preview-slider-zone-end-percent': '100%',
        } as CSSProperties;

        const contentWidthPx = Math.max(0, pageWidthPx - marginLeftPx - marginRightPx);
        const leftMarginInches = formatInches(marginLeftPx / PX_PER_INCH);
        const rightMarginInches = formatInches(marginRightPx / PX_PER_INCH);
        const contentWidthInches = formatInches(contentWidthPx / PX_PER_INCH);

        // T/B margin row options
        const marginRowOptions: FormSelectOption[] = MARGIN_ROW_OPTIONS.map(rows => ({
            value: rows,
            label: `${rows} row${rows === 1 ? '' : 's'}`,
        }));

        const topMarginRows = getClosestStepValue(
            MARGIN_ROW_OPTIONS,
            Math.round(marginTopPx / safeFontSize),
        );
        const bottomMarginRows = getClosestStepValue(
            MARGIN_ROW_OPTIONS,
            Math.round(marginBottomPx / safeFontSize),
        );

        return {
            preview: {
                pagePreviewStyle,
                headerRows,
                footerRows,
                contentRows,
            },
            slider: {
                sliderStyle,
                sliderStart,
                sliderEnd,
                previewReferenceTotal: pageWidthPx,
                minSliderStart: minStart,
                maxSliderStart: maxStart,
                minSliderEnd: minEnd,
                maxSliderEnd: maxEnd,
                leftMarginInches,
                rightMarginInches,
                contentWidthInches,
            },
            numeric: {
                topMarginRows,
                bottomMarginRows,
                marginRowOptions,
            },
        };
    }, [resolvedScriptSettings]);
};
