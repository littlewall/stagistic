import type {EditorSettings} from '@stagistic/script-core';
import {
    ELEMENT_ACT,
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_NOTE,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_SECTION,
    ELEMENT_TRANSITION,
} from '@stagistic/script-core';
import type {CSSProperties} from 'react';

type EditorCssVars = CSSProperties;

const toPx = (value?: number) => {
    if (typeof value === 'number') {
        return `${value}px`;
    }

    return undefined;
};
const toPxScaled = (value?: number, scale = 1) => {
    if (typeof value === 'number') {
        return `${value * scale}px`;
    }

    return undefined;
};
const toEm = (value?: number) => {
    if (typeof value === 'number') {
        return `${value}em`;
    }

    return undefined;
};
const toIndent = (chars?: number, px?: number) => {
    if (typeof chars === 'number') {
        return `${chars}ch`;
    }

    return toPx(px);
};
const toCasing = (value?: 'normal' | 'uppercase') => {
    if (value === 'uppercase') {
        return 'uppercase';
    }

    if (value === 'normal') {
        return 'none';
    }

    return undefined;
};
const toTextAlign = (value?: 'left' | 'center' | 'right') => value;
const toFontWeight = (value?: boolean) => {
    if (typeof value !== 'boolean') {
        return undefined;
    }

    return value ? '700' : '400';
};
const toFontStyle = (value?: boolean) => {
    if (typeof value !== 'boolean') {
        return undefined;
    }

    return value ? 'italic' : 'normal';
};
const toUnderline = (value?: boolean) => {
    if (typeof value !== 'boolean') {
        return undefined;
    }

    return value ? 'underline' : 'none';
};
const toLineGapEm = (lines?: number, lineHeight = 1) => {
    if (typeof lines !== 'number' || !Number.isFinite(lines) || lines < 0) {
        return undefined;
    }

    return `${lines * lineHeight}em`;
};

export const getEditorCssVars = (settings: EditorSettings, scale = 1): EditorCssVars => {
    const blocks = settings.blocks;
    const actLineHeight = blocks[ELEMENT_ACT]?.lineHeight ?? settings.typography.lineHeight;
    const actDisplay = settings.structure.actDisplay;

    return {
        '--editor-font-size': toPxScaled(settings.typography.fontSizePx, scale),
        '--editor-line-height': String(settings.typography.lineHeight),
        '--editor-page-width': toPxScaled(settings.page.widthPx, scale),
        '--editor-page-height': toPxScaled(settings.page.heightPx, scale),
        '--editor-margin-top': toPxScaled(settings.page.marginTopPx, scale),
        '--editor-margin-right': toPxScaled(settings.page.marginRightPx, scale),
        '--editor-margin-bottom': toPxScaled(settings.page.marginBottomPx, scale),
        '--editor-margin-left': toPxScaled(settings.page.marginLeftPx, scale),
        '--editor-page-gap': toPxScaled(settings.page.pageGapPx, scale),
        '--editor-page-break-background': settings.page.pageBreakBackground,

        // Act
        '--act-spacing-before': toLineGapEm(actDisplay.linesBefore, actLineHeight),
        '--act-spacing-after': toLineGapEm(actDisplay.linesAfter, actLineHeight),
        '--act-line-height': String(actLineHeight),
        '--act-indent-left': toIndent(blocks[ELEMENT_ACT]?.indentLeftChars, blocks[ELEMENT_ACT]?.indentLeftPx),
        '--act-indent-right': toIndent(blocks[ELEMENT_ACT]?.indentRightChars, blocks[ELEMENT_ACT]?.indentRightPx),
        '--act-align': toTextAlign(blocks[ELEMENT_ACT]?.textAlign),
        '--act-casing': toCasing(blocks[ELEMENT_ACT]?.casing),
        '--act-font-weight': toFontWeight(blocks[ELEMENT_ACT]?.isBold),
        '--act-font-style': toFontStyle(blocks[ELEMENT_ACT]?.isItalic),
        '--act-underline': toUnderline(blocks[ELEMENT_ACT]?.isUnderline),

        // Section
        '--section-spacing-before': toEm(blocks[ELEMENT_SECTION]?.spacingBeforeEm),
        '--section-line-height': String(blocks[ELEMENT_SECTION]?.lineHeight ?? settings.typography.lineHeight),
        '--section-indent-left': toIndent(blocks[ELEMENT_SECTION]?.indentLeftChars, blocks[ELEMENT_SECTION]?.indentLeftPx),
        '--section-indent-right': toIndent(blocks[ELEMENT_SECTION]?.indentRightChars, blocks[ELEMENT_SECTION]?.indentRightPx),
        '--section-align': toTextAlign(blocks[ELEMENT_SECTION]?.textAlign),
        '--section-casing': toCasing(blocks[ELEMENT_SECTION]?.casing),
        '--section-font-weight': toFontWeight(blocks[ELEMENT_SECTION]?.isBold),
        '--section-font-style': toFontStyle(blocks[ELEMENT_SECTION]?.isItalic),
        '--section-underline': toUnderline(blocks[ELEMENT_SECTION]?.isUnderline),

        /*
         * Block specific settings
         * Action
         */
        '--action-spacing-before': toEm(blocks[ELEMENT_ACTION]?.spacingBeforeEm),
        '--action-line-height': String(blocks[ELEMENT_ACTION]?.lineHeight ?? settings.typography.lineHeight),
        '--action-indent-left': toIndent(blocks[ELEMENT_ACTION]?.indentLeftChars, blocks[ELEMENT_ACTION]?.indentLeftPx),
        '--action-indent-right': toIndent(blocks[ELEMENT_ACTION]?.indentRightChars, blocks[ELEMENT_ACTION]?.indentRightPx),
        '--action-align': toTextAlign(blocks[ELEMENT_ACTION]?.textAlign),
        '--action-casing': toCasing(blocks[ELEMENT_ACTION]?.casing),
        '--action-font-weight': toFontWeight(blocks[ELEMENT_ACTION]?.isBold),
        '--action-font-style': toFontStyle(blocks[ELEMENT_ACTION]?.isItalic),
        '--action-underline': toUnderline(blocks[ELEMENT_ACTION]?.isUnderline),

        // Scene Heading
        '--scene-heading-spacing-before': toEm(blocks[ELEMENT_SCENE_HEADING]?.spacingBeforeEm),
        '--scene-heading-line-height': String(blocks[ELEMENT_SCENE_HEADING]?.lineHeight ?? settings.typography.lineHeight),
        '--scene-heading-indent-left': toIndent(blocks[ELEMENT_SCENE_HEADING]?.indentLeftChars, blocks[ELEMENT_SCENE_HEADING]?.indentLeftPx),
        '--scene-heading-indent-right': toIndent(blocks[ELEMENT_SCENE_HEADING]?.indentRightChars, blocks[ELEMENT_SCENE_HEADING]?.indentRightPx),
        '--scene-heading-align': toTextAlign(blocks[ELEMENT_SCENE_HEADING]?.textAlign),
        '--scene-heading-casing': toCasing(blocks[ELEMENT_SCENE_HEADING]?.casing),
        '--scene-heading-font-weight': toFontWeight(blocks[ELEMENT_SCENE_HEADING]?.isBold),
        '--scene-heading-font-style': toFontStyle(blocks[ELEMENT_SCENE_HEADING]?.isItalic),
        '--scene-heading-underline': toUnderline(blocks[ELEMENT_SCENE_HEADING]?.isUnderline),

        // Dialogue
        '--dialogue-indent': toIndent(blocks[ELEMENT_DIALOGUE]?.indentLeftChars, blocks[ELEMENT_DIALOGUE]?.indentLeftPx),
        '--dialogue-indent-right': toIndent(blocks[ELEMENT_DIALOGUE]?.indentRightChars, blocks[ELEMENT_DIALOGUE]?.indentRightPx),
        '--dialogue-spacing-before': toEm(blocks[ELEMENT_DIALOGUE]?.spacingBeforeEm),
        '--dialogue-line-height': String(blocks[ELEMENT_DIALOGUE]?.lineHeight ?? settings.typography.lineHeight),
        '--dialogue-align': toTextAlign(blocks[ELEMENT_DIALOGUE]?.textAlign),
        '--dialogue-casing': toCasing(blocks[ELEMENT_DIALOGUE]?.casing),
        '--dialogue-font-weight': toFontWeight(blocks[ELEMENT_DIALOGUE]?.isBold),
        '--dialogue-font-style': toFontStyle(blocks[ELEMENT_DIALOGUE]?.isItalic),
        '--dialogue-underline': toUnderline(blocks[ELEMENT_DIALOGUE]?.isUnderline),

        // Parenthetical
        '--parenthetical-indent-left': toIndent(blocks[ELEMENT_PARENTHETICAL]?.indentLeftChars, blocks[ELEMENT_PARENTHETICAL]?.indentLeftPx),
        '--parenthetical-indent-right': toIndent(blocks[ELEMENT_PARENTHETICAL]?.indentRightChars, blocks[ELEMENT_PARENTHETICAL]?.indentRightPx),
        '--parenthetical-spacing-before': toEm(blocks[ELEMENT_PARENTHETICAL]?.spacingBeforeEm),
        '--parenthetical-line-height': String(blocks[ELEMENT_PARENTHETICAL]?.lineHeight ?? settings.typography.lineHeight),
        '--parenthetical-align': toTextAlign(blocks[ELEMENT_PARENTHETICAL]?.textAlign),
        '--parenthetical-casing': toCasing(blocks[ELEMENT_PARENTHETICAL]?.casing),
        '--parenthetical-font-weight': toFontWeight(blocks[ELEMENT_PARENTHETICAL]?.isBold),
        '--parenthetical-font-style': toFontStyle(blocks[ELEMENT_PARENTHETICAL]?.isItalic),
        '--parenthetical-underline': toUnderline(blocks[ELEMENT_PARENTHETICAL]?.isUnderline),

        // Character
        '--character-indent': toIndent(blocks[ELEMENT_CHARACTER]?.indentLeftChars, blocks[ELEMENT_CHARACTER]?.indentLeftPx),
        '--character-indent-right': toIndent(blocks[ELEMENT_CHARACTER]?.indentRightChars, blocks[ELEMENT_CHARACTER]?.indentRightPx),
        '--character-spacing-before': toEm(blocks[ELEMENT_CHARACTER]?.spacingBeforeEm),
        '--character-line-height': String(blocks[ELEMENT_CHARACTER]?.lineHeight ?? settings.typography.lineHeight),
        '--character-align': toTextAlign(blocks[ELEMENT_CHARACTER]?.textAlign),
        '--character-casing': toCasing(blocks[ELEMENT_CHARACTER]?.casing),
        '--character-font-weight': toFontWeight(blocks[ELEMENT_CHARACTER]?.isBold),
        '--character-font-style': toFontStyle(blocks[ELEMENT_CHARACTER]?.isItalic),
        '--character-underline': toUnderline(blocks[ELEMENT_CHARACTER]?.isUnderline),

        // Transition
        '--transition-gap': toEm(blocks[ELEMENT_TRANSITION]?.spacingBeforeEm), // Keep for compat if needed, but prefer spacing-before
        '--transition-indent': toIndent(blocks[ELEMENT_TRANSITION]?.indentLeftChars, blocks[ELEMENT_TRANSITION]?.indentLeftPx),
        '--transition-indent-right': toIndent(blocks[ELEMENT_TRANSITION]?.indentRightChars, blocks[ELEMENT_TRANSITION]?.indentRightPx),
        '--transition-spacing-before': toEm(blocks[ELEMENT_TRANSITION]?.spacingBeforeEm),
        '--transition-line-height': String(blocks[ELEMENT_TRANSITION]?.lineHeight ?? settings.typography.lineHeight),
        '--transition-align': toTextAlign(blocks[ELEMENT_TRANSITION]?.textAlign),
        '--transition-casing': toCasing(blocks[ELEMENT_TRANSITION]?.casing),
        '--transition-font-weight': toFontWeight(blocks[ELEMENT_TRANSITION]?.isBold),
        '--transition-font-style': toFontStyle(blocks[ELEMENT_TRANSITION]?.isItalic),
        '--transition-underline': toUnderline(blocks[ELEMENT_TRANSITION]?.isUnderline),

        // Dual Character
        '--dual-character-indent': toIndent(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.indentLeftChars, blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.indentLeftPx),
        '--dual-character-indent-right': toIndent(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.indentRightChars, blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.indentRightPx),
        '--dual-character-spacing-before': toEm(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.spacingBeforeEm),
        '--dual-character-line-height': String(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.lineHeight ?? settings.typography.lineHeight),
        '--dual-character-align': toTextAlign(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.textAlign),
        '--dual-character-casing': toCasing(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.casing),
        '--dual-character-font-weight': toFontWeight(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.isBold),
        '--dual-character-font-style': toFontStyle(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.isItalic),
        '--dual-character-underline': toUnderline(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.isUnderline),

        // Lyrics
        '--lyrics-spacing-before': toEm(blocks[ELEMENT_LYRICS]?.spacingBeforeEm),
        '--lyrics-line-height': String(blocks[ELEMENT_LYRICS]?.lineHeight ?? settings.typography.lineHeight),
        '--lyrics-indent-left': toIndent(blocks[ELEMENT_LYRICS]?.indentLeftChars, blocks[ELEMENT_LYRICS]?.indentLeftPx),
        '--lyrics-indent-right': toIndent(blocks[ELEMENT_LYRICS]?.indentRightChars, blocks[ELEMENT_LYRICS]?.indentRightPx),
        '--lyrics-align': toTextAlign(blocks[ELEMENT_LYRICS]?.textAlign),
        '--lyrics-casing': toCasing(blocks[ELEMENT_LYRICS]?.casing),
        '--lyrics-font-weight': toFontWeight(blocks[ELEMENT_LYRICS]?.isBold),
        '--lyrics-font-style': toFontStyle(blocks[ELEMENT_LYRICS]?.isItalic),
        '--lyrics-underline': toUnderline(blocks[ELEMENT_LYRICS]?.isUnderline),

        // Notes
        '--note-spacing-before': toEm(blocks[ELEMENT_NOTE]?.spacingBeforeEm),
        '--note-line-height': String(blocks[ELEMENT_NOTE]?.lineHeight ?? settings.typography.lineHeight),
        '--note-indent-left': toIndent(blocks[ELEMENT_NOTE]?.indentLeftChars, blocks[ELEMENT_NOTE]?.indentLeftPx),
        '--note-indent-right': toIndent(blocks[ELEMENT_NOTE]?.indentRightChars, blocks[ELEMENT_NOTE]?.indentRightPx),
        '--note-align': toTextAlign(blocks[ELEMENT_NOTE]?.textAlign),
        '--note-casing': toCasing(blocks[ELEMENT_NOTE]?.casing),
        '--note-font-weight': toFontWeight(blocks[ELEMENT_NOTE]?.isBold),
        '--note-font-style': toFontStyle(blocks[ELEMENT_NOTE]?.isItalic),
        '--note-underline': toUnderline(blocks[ELEMENT_NOTE]?.isUnderline),

        // Backward compatibility mappings (if any strictly needed by old code not being updated yet)
        '--editor-character-indent': toIndent(blocks[ELEMENT_CHARACTER]?.indentLeftChars, blocks[ELEMENT_CHARACTER]?.indentLeftPx),
        '--editor-character-gap': toEm(blocks[ELEMENT_CHARACTER]?.spacingBeforeEm),
        '--editor-dual-character-indent': toIndent(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.indentLeftChars, blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.indentLeftPx),
        '--editor-dual-character-gap': toEm(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.spacingBeforeEm),
        '--editor-transition-gap': toEm(blocks[ELEMENT_TRANSITION]?.spacingBeforeEm),
        '--editor-transition-indent': toIndent(blocks[ELEMENT_TRANSITION]?.indentLeftChars, blocks[ELEMENT_TRANSITION]?.indentLeftPx),
    } as EditorCssVars;
};
