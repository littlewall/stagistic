import {BLOCK_ICONS} from '@stagistic/editor';
import {
    BLOCK_SHORTCUT_OPTIONS,
    DEFAULT_EDITOR_SETTINGS,
} from '@stagistic/script';
import {type CSSProperties, useMemo} from 'react';

import {
    BLOCK_PREVIEW_TEXT,
    BLOCK_PREVIEW_TEXT_COLOR,
    LINE_HEIGHT_OPTIONS,
    MAX_INDENT_CHARS,
    MIN_PREVIEW_CONTENT_CHARS,
    PX_PER_INCH,
    SCREENPLAY_CHARS_PER_INCH,
    SPACING_BEFORE_OPTIONS,
} from '../constants';
import {
    clamp,
    formatLines,
    formatNumeric,
    getClosestStepValue,
} from '../math';
import type {ElementSettingsPanelProps, ElementSettingsViewModel} from '../types';
import {
    getFormattingValues,
    getIndents,
    getNavigationValues,
    getPageValues,
    NEXT_ELEMENT_ITEMS,
} from './elementSettingsValues';

export const useElementSettingsViewModel = ({
    blockType,
    resolvedScriptSettings,
}: Pick<ElementSettingsPanelProps, 'blockType' | 'resolvedScriptSettings'>): ElementSettingsViewModel => {
    return useMemo(() => {
        const nextElementItems = NEXT_ELEMENT_ITEMS;
        const blockDefaults = DEFAULT_EDITOR_SETTINGS.blocks[blockType];
        const blockSettings = resolvedScriptSettings.blocks[blockType];
        const {
            pageWidthPx,
            pageMarginLeftPx,
            pageMarginRightPx,
            typographyFontSizePx,
            fallbackTypographyLineHeight,
        } = getPageValues(resolvedScriptSettings);
        const previewReferenceChars = Math.max(
            MIN_PREVIEW_CONTENT_CHARS,
            Math.round(Math.max(0, (pageWidthPx - pageMarginLeftPx - pageMarginRightPx) / PX_PER_INCH) * SCREENPLAY_CHARS_PER_INCH),
        );
        const {leftIndent: defaultLeftIndent, rightIndent: defaultRightIndent} = getIndents({blockType, resolvedScriptSettings: DEFAULT_EDITOR_SETTINGS});
        const defaultContentChars = Math.max(1, previewReferenceChars - defaultLeftIndent - defaultRightIndent);
        const minPreviewContentChars = Math.min(MIN_PREVIEW_CONTENT_CHARS, defaultContentChars);
        const spacingBefore = getClosestStepValue(SPACING_BEFORE_OPTIONS, blockSettings.spacingBeforeEm ?? blockDefaults.spacingBeforeEm ?? 0);
        const hasSpacingAfter = blockDefaults.spacingAfterEm !== undefined || ['stageDirection', 'lyrics'].includes(blockType);
        const spacingAfterRaw = hasSpacingAfter ? blockSettings.spacingAfterEm ?? blockDefaults.spacingAfterEm ?? 0 : undefined;
        const spacingAfter = spacingAfterRaw === undefined ? undefined : getClosestStepValue(SPACING_BEFORE_OPTIONS, spacingAfterRaw);
        const lineHeight = getClosestStepValue(LINE_HEIGHT_OPTIONS, blockSettings.lineHeight ?? blockDefaults.lineHeight ?? fallbackTypographyLineHeight);
        const {leftIndent, rightIndent} = getIndents({blockType, resolvedScriptSettings});
        const {
            isActBlock,
            shortcut,
            nextElement,
            sceneNumberFormat,
            sceneNumberFormatOptions,
        } = getNavigationValues({blockType, resolvedScriptSettings});
        const {
            textAlign,
            casing,
            isBold,
            isItalic,
            isUnderline,
        } = getFormattingValues({blockType, resolvedScriptSettings});
        const previewText = BLOCK_PREVIEW_TEXT[blockType];
        const previewTextOffsetChars = blockType === 'aside' ? 1 : 0;
        const spacingBeforeOptions = SPACING_BEFORE_OPTIONS.map(option => ({
            value: option,
            label: formatLines(option),
        }));
        const lineHeightOptions = LINE_HEIGHT_OPTIONS.map(option => ({
            value: option,
            label: formatNumeric(option),
        }));
        const shortcutOptions = isActBlock
            ? undefined
            : BLOCK_SHORTCUT_OPTIONS.map(option => ({
                value: option,
                label: option,
            }));
        const nextElementOptions = isActBlock
            ? undefined
            : nextElementItems.map(item => ({
                value: item.blockType,
                label: item.label,
                icon: BLOCK_ICONS[item.blockType],
            }));
        const normalizedLeftIndent = clamp(Math.round(leftIndent), 0, MAX_INDENT_CHARS);
        const normalizedRightIndent = clamp(Math.round(rightIndent), 0, MAX_INDENT_CHARS);
        const defaultSliderStartChars = 0;
        const defaultSliderEndChars = previewReferenceChars;
        const currentEndChars = previewReferenceChars - normalizedRightIndent;
        const initialSliderStart = clamp(normalizedLeftIndent, defaultSliderStartChars, defaultSliderEndChars - minPreviewContentChars);
        const initialSliderEnd = clamp(currentEndChars, defaultSliderStartChars + minPreviewContentChars, defaultSliderEndChars);
        const sliderStart = clamp(initialSliderStart, defaultSliderStartChars, initialSliderEnd - minPreviewContentChars);
        const sliderEnd = clamp(initialSliderEnd, sliderStart + minPreviewContentChars, defaultSliderEndChars);
        const contentChars = Math.max(minPreviewContentChars, sliderEnd - sliderStart);
        const leftTotalInches = pageMarginLeftPx / PX_PER_INCH + sliderStart / SCREENPLAY_CHARS_PER_INCH;
        const rightTotalInches = pageMarginRightPx / PX_PER_INCH + (previewReferenceChars - sliderEnd) / SCREENPLAY_CHARS_PER_INCH;
        const safePageWidthPx = Math.max(1, pageWidthPx);
        const pageStartPercent = clamp((pageMarginLeftPx / safePageWidthPx) * 100, 0, 45);
        const pageEndPercent = clamp(100 - (pageMarginRightPx / safePageWidthPx) * 100, 55, 100);
        const pageContentPercent = Math.max(8, pageEndPercent - pageStartPercent);
        const lineStartPercent = pageStartPercent + (sliderStart / previewReferenceChars) * pageContentPercent;
        const lineEndPercent = pageStartPercent + (sliderEnd / previewReferenceChars) * pageContentPercent;
        const previewStyle = {
            '--preview-spacing-before': `${Math.max(0, spacingBefore) * typographyFontSizePx}px`,
            '--preview-spacing-after': spacingAfter === undefined ? '0px' : `${Math.max(0, spacingAfter) * typographyFontSizePx}px`,
            '--preview-spacing-line-unit': `${typographyFontSizePx}px`,
            '--preview-line-height': String(lineHeight),
            '--preview-line-box-height': `${typographyFontSizePx}px`,
            '--preview-font-size': `${typographyFontSizePx}px`,
            '--preview-line-start-percent': `${lineStartPercent}%`,
            '--preview-line-width': `${Math.max(6, lineEndPercent - lineStartPercent)}%`,
            '--preview-slider-zone-start-percent': `${pageStartPercent}%`,
            '--preview-slider-zone-end-percent': `${pageEndPercent}%`,
            '--preview-indent-start-percent': `${lineStartPercent}%`,
            '--preview-indent-end-percent': `${lineEndPercent}%`,
            '--preview-indent-default-start-percent': `${pageStartPercent}%`,
            '--preview-indent-default-end-percent': `${pageEndPercent}%`,
            '--preview-text-align': textAlign,
            '--preview-text-transform': casing === 'uppercase' || casing === 'lowercase' ? casing : 'none',
            '--preview-font-weight': isBold ? '700' : '400',
            '--preview-font-style': isItalic ? 'italic' : 'normal',
            '--preview-text-decoration': isUnderline ? 'underline' : 'none',
            '--preview-text-offset-ch': String(previewTextOffsetChars),
            '--preview-text-color': BLOCK_PREVIEW_TEXT_COLOR[blockType],
        } as CSSProperties;

        const spacingAfterOptions = hasSpacingAfter
            ? SPACING_BEFORE_OPTIONS.map(option => ({
                value: option,
                label: formatLines(option),
            }))
            : undefined;

        return {
            formatting: {
                textAlign,
                casing,
                isBold,
                isItalic,
                isUnderline,
            },
            numeric: {
                spacingBefore,
                spacingAfter,
                lineHeight,
                shortcut,
                nextElement,
                sceneNumberFormat,
                spacingBeforeOptions,
                spacingAfterOptions,
                lineHeightOptions,
                shortcutOptions,
                nextElementOptions,
                sceneNumberFormatOptions,
            },
            preview: {
                previewText,
                previewStyle,
                sliderStart,
                sliderEnd,
                previewReferenceChars,
                minPreviewContentChars,
                zoneStartPercent: pageStartPercent,
                zoneEndPercent: pageEndPercent,
                leftTotalInches,
                rightTotalInches,
                contentChars,
                hasSpacingAfter,
            },
        };
    }, [blockType, resolvedScriptSettings]);
};
