import {BLOCK_ICONS} from '@stagistic/editor-ui';
import {
    BLOCK_CASING_OPTIONS,
    BLOCK_SHORTCUT_OPTIONS,
    BLOCK_TEXT_ALIGN_OPTIONS,
    DEFAULT_EDITOR_SETTINGS,
    ELEMENT_PARENTHETICAL,
} from '@stagistic/script-core';
import {type CSSProperties, useMemo} from 'react';

import {SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS} from '../../settings/settingsMenu';
import {
    BLOCK_PREVIEW_TEXT,
    BLOCK_PREVIEW_TEXT_COLOR,
    LINE_HEIGHT_OPTIONS,
    MAX_INDENT_CHARS,
    MIN_PREVIEW_CONTENT_CHARS,
    PX_PER_INCH,
    SCREENPLAY_CHARS_PER_INCH,
    SPACING_BEFORE_OPTIONS,
} from './constants';
import {
    clamp,
    formatLines,
    formatNumeric,
    getClosestStepValue,
} from './math';
import type {
    ElementSettingsPanelProps,
    ElementSettingsViewModel,
} from './types';

export const useElementSettingsViewModel = ({
    blockType,
    resolvedScriptSettings,
}: Pick<ElementSettingsPanelProps, 'blockType' | 'resolvedScriptSettings'>): ElementSettingsViewModel => {
    return useMemo(() => {
        const blockDefaults = DEFAULT_EDITOR_SETTINGS.blocks[blockType];
        const blockSettings = resolvedScriptSettings.blocks[blockType];
        const pageWidthPx = resolvedScriptSettings.page.widthPx ?? DEFAULT_EDITOR_SETTINGS.page.widthPx;
        const pageMarginLeftPx = resolvedScriptSettings.page.marginLeftPx ?? DEFAULT_EDITOR_SETTINGS.page.marginLeftPx;
        const pageMarginRightPx = resolvedScriptSettings.page.marginRightPx ?? DEFAULT_EDITOR_SETTINGS.page.marginRightPx;
        const typographyFontSizePx = resolvedScriptSettings.typography.fontSizePx
            ?? DEFAULT_EDITOR_SETTINGS.typography.fontSizePx;
        const fallbackTypographyLineHeight = resolvedScriptSettings.typography.lineHeight
            ?? DEFAULT_EDITOR_SETTINGS.typography.lineHeight;
        const previewReferenceChars = Math.max(
            MIN_PREVIEW_CONTENT_CHARS,
            Math.round(
                Math.max(0, (pageWidthPx - pageMarginLeftPx - pageMarginRightPx) / PX_PER_INCH) * SCREENPLAY_CHARS_PER_INCH,
            ),
        );
        const defaultContentChars = Math.max(
            1,
            previewReferenceChars - (blockDefaults.indentLeftChars ?? 0) - (blockDefaults.indentRightChars ?? 0),
        );
        const minPreviewContentChars = Math.min(MIN_PREVIEW_CONTENT_CHARS, defaultContentChars);
        const spacingBefore = getClosestStepValue(
            SPACING_BEFORE_OPTIONS,
            blockSettings.spacingBeforeEm ?? blockDefaults.spacingBeforeEm ?? 0,
        );
        const lineHeight = getClosestStepValue(
            LINE_HEIGHT_OPTIONS,
            blockSettings.lineHeight ?? blockDefaults.lineHeight ?? fallbackTypographyLineHeight,
        );
        const leftIndent = blockSettings.indentLeftChars ?? blockDefaults.indentLeftChars ?? 0;
        const rightIndent = blockSettings.indentRightChars ?? blockDefaults.indentRightChars ?? 0;
        const shortcut = blockSettings.shortcut ?? blockDefaults.shortcut ?? BLOCK_SHORTCUT_OPTIONS[0];
        const nextElement = blockSettings.nextElement ?? blockDefaults.nextElement ?? blockType;
        const textAlign = blockSettings.textAlign ?? blockDefaults.textAlign ?? BLOCK_TEXT_ALIGN_OPTIONS[0];
        const casing = blockSettings.casing ?? blockDefaults.casing ?? BLOCK_CASING_OPTIONS[0];
        const isBold = blockSettings.isBold ?? blockDefaults.isBold ?? false;
        const isItalic = blockSettings.isItalic ?? blockDefaults.isItalic ?? false;
        const isUnderline = blockSettings.isUnderline ?? blockDefaults.isUnderline ?? false;
        const previewText = BLOCK_PREVIEW_TEXT[blockType];
        const previewTextOffsetChars = blockType === ELEMENT_PARENTHETICAL ? 1 : 0;
        const spacingBeforeOptions = SPACING_BEFORE_OPTIONS.map(option => ({
            value: option,
            label: formatLines(option),
        }));
        const lineHeightOptions = LINE_HEIGHT_OPTIONS.map(option => ({
            value: option,
            label: formatNumeric(option),
        }));
        const shortcutOptions = BLOCK_SHORTCUT_OPTIONS.map(option => ({
            value: option,
            label: option,
        }));
        const nextElementOptions = SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS.map(item => ({
            value: item.blockType,
            label: item.label,
            icon: BLOCK_ICONS[item.blockType],
        }));
        const normalizedLeftIndent = clamp(
            Math.round(leftIndent),
            0,
            MAX_INDENT_CHARS,
        );
        const normalizedRightIndent = clamp(
            Math.round(rightIndent),
            0,
            MAX_INDENT_CHARS,
        );
        const defaultSliderStartChars = 0;
        const defaultSliderEndChars = previewReferenceChars;
        const currentEndChars = previewReferenceChars - normalizedRightIndent;
        const initialSliderStart = clamp(
            normalizedLeftIndent,
            defaultSliderStartChars,
            defaultSliderEndChars - minPreviewContentChars,
        );
        const initialSliderEnd = clamp(
            currentEndChars,
            defaultSliderStartChars + minPreviewContentChars,
            defaultSliderEndChars,
        );
        const sliderStart = clamp(
            initialSliderStart,
            defaultSliderStartChars,
            initialSliderEnd - minPreviewContentChars,
        );
        const sliderEnd = clamp(
            initialSliderEnd,
            sliderStart + minPreviewContentChars,
            defaultSliderEndChars,
        );
        const contentChars = Math.max(minPreviewContentChars, sliderEnd - sliderStart);
        const leftTotalInches = (pageMarginLeftPx / PX_PER_INCH) + (sliderStart / SCREENPLAY_CHARS_PER_INCH);
        const rightTotalInches = (pageMarginRightPx / PX_PER_INCH)
            + ((previewReferenceChars - sliderEnd) / SCREENPLAY_CHARS_PER_INCH);
        const safePageWidthPx = Math.max(1, pageWidthPx);
        const pageStartPercent = clamp((pageMarginLeftPx / safePageWidthPx) * 100, 0, 45);
        const pageEndPercent = clamp(100 - ((pageMarginRightPx / safePageWidthPx) * 100), 55, 100);
        const pageContentPercent = Math.max(8, pageEndPercent - pageStartPercent);
        const lineStartPercent = pageStartPercent + ((sliderStart / previewReferenceChars) * pageContentPercent);
        const lineEndPercent = pageStartPercent + ((sliderEnd / previewReferenceChars) * pageContentPercent);
        const previewStyle = {
            '--preview-spacing-before': `${Math.max(0, spacingBefore) * typographyFontSizePx}px`,
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
            '--preview-text-transform': casing === 'uppercase' ? 'uppercase' : 'none',
            '--preview-font-weight': isBold ? '700' : '400',
            '--preview-font-style': isItalic ? 'italic' : 'normal',
            '--preview-text-decoration': isUnderline ? 'underline' : 'none',
            '--preview-text-offset-ch': String(previewTextOffsetChars),
            '--preview-text-color': BLOCK_PREVIEW_TEXT_COLOR[blockType],
        } as CSSProperties;

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
                lineHeight,
                shortcut,
                nextElement,
                spacingBeforeOptions,
                lineHeightOptions,
                shortcutOptions,
                nextElementOptions,
            },
            preview: {
                previewText,
                previewStyle,
                sliderStart,
                sliderEnd,
                previewReferenceChars,
                minPreviewContentChars,
                leftTotalInches,
                rightTotalInches,
                contentChars,
            },
        };
    }, [blockType, resolvedScriptSettings]);
};
