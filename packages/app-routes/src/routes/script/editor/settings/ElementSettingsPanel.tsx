import {
    ELEMENT_PARENTHETICAL,
    type FountainElementType,
} from '@stagistic/editor-core';
import {BLOCK_ICONS} from '@stagistic/editor-ui';
import {
    BLOCK_CASING_OPTIONS,
    BLOCK_SHORTCUT_OPTIONS,
    BLOCK_TEXT_ALIGN_OPTIONS,
    DEFAULT_EDITOR_SETTINGS,
} from '@stagistic/shared';
import {type CSSProperties} from 'react';

import styles from '../../ScriptEditorRoute.module.css';
import {SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS} from '../../settings/settingsMenu';
import {
    BLOCK_PREVIEW_TEXT,
    BLOCK_PREVIEW_TEXT_COLOR,
    LINE_HEIGHT_OPTIONS,
    MAX_INDENT_CHARS,
    MIN_PREVIEW_CONTENT_CHARS,
    SCREENPLAY_CHARS_PER_INCH,
    SPACING_BEFORE_OPTIONS,
} from './constants';
import {
    clamp,
    formatInches,
    formatLines,
    formatNumeric,
    getClosestStepValue,
} from './math';
import {
    SettingsSelect,
    type SettingsSelectOption,
} from './SettingsSelect';
import type {ElementSettingsPanelProps} from './types';

export const ElementSettingsPanel = ({
    blockType,
    blockLabel,
    resolvedScriptSettings,
    shortcutPrefix,
    onUpdateBlockSettings,
}: ElementSettingsPanelProps) => {
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
            Math.max(0, (pageWidthPx - pageMarginLeftPx - pageMarginRightPx) / 96) * SCREENPLAY_CHARS_PER_INCH,
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
    const spacingBeforeOptions: SettingsSelectOption[] = SPACING_BEFORE_OPTIONS.map(option => ({
        value: option,
        label: formatLines(option),
    }));
    const lineHeightOptions: SettingsSelectOption[] = LINE_HEIGHT_OPTIONS.map(option => ({
        value: option,
        label: formatNumeric(option),
    }));
    const shortcutOptions: SettingsSelectOption[] = BLOCK_SHORTCUT_OPTIONS.map(option => ({
        value: option,
        label: option,
    }));
    const nextElementOptions: SettingsSelectOption[] = SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS.map(item => ({
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
    const leftTotalInches = (pageMarginLeftPx / 96) + (sliderStart / SCREENPLAY_CHARS_PER_INCH);
    const rightTotalInches = (pageMarginRightPx / 96)
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

    return (
        <div className={styles.panelStack}>
            <h3 className={styles.panelTitle}>{blockLabel}</h3>
            <div className={styles.previewCard} style={previewStyle}>
                <div className={styles.previewToolbar}>
                    <div className={styles.toolbarGroup}>
                        {BLOCK_TEXT_ALIGN_OPTIONS.map(option => (
                            <button
                                key={option}
                                type="button"
                                className={option === textAlign ? styles.toolbarButtonActive : styles.toolbarButton}
                                onClick={() => {
                                    onUpdateBlockSettings(blockType, {
                                        textAlign: option,
                                    });
                                }}
                                aria-label={`${option} align`}
                            >
                                <span
                                    className={`${styles.alignGlyph} ${
                                        option === 'left'
                                            ? styles.alignGlyphLeft
                                            : option === 'center'
                                                ? styles.alignGlyphCenter
                                                : styles.alignGlyphRight
                                    }`}
                                />
                            </button>
                        ))}
                    </div>
                    <div className={styles.toolbarGroup}>
                        <button
                            type="button"
                            className={casing === 'normal' ? styles.toolbarButtonActive : styles.toolbarButton}
                            onClick={() => {
                                onUpdateBlockSettings(blockType, {
                                    casing: 'normal',
                                });
                            }}
                            aria-label="Normal casing"
                        >
                            <span className={styles.textIcon}>Aa</span>
                        </button>
                        <button
                            type="button"
                            className={casing === 'uppercase' ? styles.toolbarButtonActive : styles.toolbarButton}
                            onClick={() => {
                                onUpdateBlockSettings(blockType, {
                                    casing: 'uppercase',
                                });
                            }}
                            aria-label="Uppercase casing"
                        >
                            <span className={styles.textIcon}>AA</span>
                        </button>
                    </div>
                    <div className={styles.toolbarGroup}>
                        <button
                            type="button"
                            className={isBold ? styles.toolbarButtonActive : styles.toolbarButton}
                            onClick={() => onUpdateBlockSettings(blockType, {isBold: !isBold})}
                            aria-label="Bold"
                        >
                            <span className={styles.textIcon}>B</span>
                        </button>
                        <button
                            type="button"
                            className={isItalic ? styles.toolbarButtonActive : styles.toolbarButton}
                            onClick={() => onUpdateBlockSettings(blockType, {isItalic: !isItalic})}
                            aria-label="Italic"
                        >
                            <span className={`${styles.textIcon} ${styles.textIconItalic}`}>I</span>
                        </button>
                        <button
                            type="button"
                            className={isUnderline ? styles.toolbarButtonActive : styles.toolbarButton}
                            onClick={() => onUpdateBlockSettings(blockType, {isUnderline: !isUnderline})}
                            aria-label="Underline"
                        >
                            <span className={`${styles.textIcon} ${styles.textIconUnderline}`}>U</span>
                        </button>
                    </div>
                </div>
                <div className={styles.previewSpacingRow} />
                <div className={styles.previewLineCanvas}>
                    <div className={styles.previewLineInner}>
                        <span className={styles.previewLineText}>{previewText}</span>
                    </div>
                </div>
                <div className={styles.indentSliderTrack}>
                    <span className={styles.indentSliderBase} />
                    <span className={styles.indentSliderMiddleBase} />
                    <span className={styles.indentSliderSelected} />
                    <span className={styles.indentSliderDefaultStart} />
                    <span className={styles.indentSliderDefaultEnd} />
                    <input
                        type="range"
                        className={`${styles.indentSliderInput} ${styles.indentSliderInputStart}`}
                        min={0}
                        max={previewReferenceChars}
                        step={1}
                        value={sliderStart}
                        onChange={event => {
                            const rawStart = Number.parseInt(event.target.value, 10);
                            const maxStart = Math.max(
                                defaultSliderStartChars,
                                sliderEnd - minPreviewContentChars,
                            );
                            const nextStart = clamp(rawStart, defaultSliderStartChars, maxStart);

                            onUpdateBlockSettings(blockType, {
                                indentLeftChars: nextStart,
                            });
                        }}
                        aria-label="Block start indent"
                    />
                    <input
                        type="range"
                        className={`${styles.indentSliderInput} ${styles.indentSliderInputEnd}`}
                        min={0}
                        max={previewReferenceChars}
                        step={1}
                        value={sliderEnd}
                        onChange={event => {
                            const rawEnd = Number.parseInt(event.target.value, 10);
                            const minEnd = sliderStart + minPreviewContentChars;
                            const nextEnd = clamp(rawEnd, minEnd, defaultSliderEndChars);

                            onUpdateBlockSettings(blockType, {
                                indentRightChars: previewReferenceChars - nextEnd,
                            });
                        }}
                        aria-label="Block end indent"
                    />
                </div>
                <div className={styles.indentSliderLabels}>
                    <span>{'Start: '}{formatInches(leftTotalInches)}</span>
                    <span>{formatNumeric(contentChars / SCREENPLAY_CHARS_PER_INCH)}&quot; / {contentChars} chars</span>
                    <span>{'End: '}{formatInches(rightTotalInches)}</span>
                </div>
            </div>
            <div className={styles.settingsFlatGrid}>
                <div className={styles.settingsField}>
                    <span className={styles.fieldLabel}>Spacing before</span>
                    <SettingsSelect
                        id="settings-spacing-before"
                        ariaLabel="Select spacing before"
                        value={spacingBefore}
                        options={spacingBeforeOptions}
                        onChange={nextValue => {
                            onUpdateBlockSettings(blockType, {
                                spacingBeforeEm: Number(nextValue),
                            });
                        }}
                    />
                </div>
                <div className={styles.settingsField}>
                    <span className={styles.fieldLabel}>Line height</span>
                    <SettingsSelect
                        id="settings-line-height"
                        ariaLabel="Select line height"
                        value={lineHeight}
                        options={lineHeightOptions}
                        onChange={nextValue => {
                            onUpdateBlockSettings(blockType, {
                                lineHeight: Number(nextValue),
                            });
                        }}
                    />
                </div>
                <div className={styles.settingsField}>
                    <span className={styles.fieldLabel}>Shortcut</span>
                    <div className={styles.shortcutField}>
                        <span className={styles.shortcutPrefix}>{shortcutPrefix} +</span>
                        <SettingsSelect
                            ariaLabel="Select block shortcut"
                            value={shortcut}
                            options={shortcutOptions}
                            onChange={nextValue => {
                                onUpdateBlockSettings(blockType, {
                                    shortcut: nextValue as typeof shortcut,
                                });
                            }}
                        />
                    </div>
                </div>
                <div className={styles.settingsField}>
                    <span className={styles.fieldLabel}>Next element</span>
                    <SettingsSelect
                        id="settings-next-element"
                        ariaLabel="Select next element"
                        value={nextElement}
                        options={nextElementOptions}
                        onChange={nextValue => {
                            onUpdateBlockSettings(blockType, {
                                nextElement: nextValue as FountainElementType,
                            });
                        }}
                    />
                </div>
            </div>
        </div>
    );
};
