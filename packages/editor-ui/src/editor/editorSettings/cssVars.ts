import {
    ELEMENT_ACTION,
    ELEMENT_CENTERED,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
} from '@stagistic/editor-core';
import type {EditorSettings} from '@stagistic/shared';
import type {CSSProperties} from 'react';

type EditorCssVars = CSSProperties;

const toPx = (value?: number) => (typeof value === 'number' ? `${value}px` : undefined);
const toPxScaled = (value?: number, scale = 1) => typeof value === 'number' ? `${value * scale}px` : undefined;
const toEm = (value?: number) => typeof value === 'number' ? `${value}em` : undefined;
const toIndent = (chars?: number, px?: number) => {
    if (typeof chars === 'number') {
        return `${chars}ch`;
    }

    return toPx(px);
};

export const getEditorCssVars = (settings: EditorSettings, scale = 1): EditorCssVars => {
    const blocks = settings.blocks;

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

        /*
         * Block specific settings
         * Action
         */
        '--action-spacing-before': toEm(blocks[ELEMENT_ACTION]?.spacingBeforeEm),
        '--action-line-height': String(blocks[ELEMENT_ACTION]?.lineHeight ?? settings.typography.lineHeight),
        '--action-indent-left': toIndent(blocks[ELEMENT_ACTION]?.indentLeftChars, blocks[ELEMENT_ACTION]?.indentLeftPx),
        '--action-indent-right': toIndent(blocks[ELEMENT_ACTION]?.indentRightChars, blocks[ELEMENT_ACTION]?.indentRightPx),

        // Scene Heading
        '--scene-heading-spacing-before': toEm(blocks[ELEMENT_SCENE_HEADING]?.spacingBeforeEm),
        '--scene-heading-line-height': String(blocks[ELEMENT_SCENE_HEADING]?.lineHeight ?? settings.typography.lineHeight),
        '--scene-heading-indent-left': toIndent(blocks[ELEMENT_SCENE_HEADING]?.indentLeftChars, blocks[ELEMENT_SCENE_HEADING]?.indentLeftPx),
        '--scene-heading-indent-right': toIndent(blocks[ELEMENT_SCENE_HEADING]?.indentRightChars, blocks[ELEMENT_SCENE_HEADING]?.indentRightPx),

        // Dialogue
        '--dialogue-indent': toIndent(blocks[ELEMENT_DIALOGUE]?.indentLeftChars, blocks[ELEMENT_DIALOGUE]?.indentLeftPx),
        '--dialogue-indent-right': toIndent(blocks[ELEMENT_DIALOGUE]?.indentRightChars, blocks[ELEMENT_DIALOGUE]?.indentRightPx),
        '--dialogue-spacing-before': toEm(blocks[ELEMENT_DIALOGUE]?.spacingBeforeEm),
        '--dialogue-line-height': String(blocks[ELEMENT_DIALOGUE]?.lineHeight ?? settings.typography.lineHeight),

        // Parenthetical
        '--parenthetical-indent-left': toIndent(blocks[ELEMENT_PARENTHETICAL]?.indentLeftChars, blocks[ELEMENT_PARENTHETICAL]?.indentLeftPx),
        '--parenthetical-indent-right': toIndent(blocks[ELEMENT_PARENTHETICAL]?.indentRightChars, blocks[ELEMENT_PARENTHETICAL]?.indentRightPx),
        '--parenthetical-spacing-before': toEm(blocks[ELEMENT_PARENTHETICAL]?.spacingBeforeEm),
        '--parenthetical-line-height': String(blocks[ELEMENT_PARENTHETICAL]?.lineHeight ?? settings.typography.lineHeight),

        // Character
        '--character-indent': toIndent(blocks[ELEMENT_CHARACTER]?.indentLeftChars, blocks[ELEMENT_CHARACTER]?.indentLeftPx),
        '--character-indent-right': toIndent(blocks[ELEMENT_CHARACTER]?.indentRightChars, blocks[ELEMENT_CHARACTER]?.indentRightPx),
        '--character-spacing-before': toEm(blocks[ELEMENT_CHARACTER]?.spacingBeforeEm),
        '--character-line-height': String(blocks[ELEMENT_CHARACTER]?.lineHeight ?? settings.typography.lineHeight),

        // Transition
        '--transition-gap': toEm(blocks[ELEMENT_TRANSITION]?.spacingBeforeEm), // Keep for compat if needed, but prefer spacing-before
        '--transition-indent': toIndent(blocks[ELEMENT_TRANSITION]?.indentLeftChars, blocks[ELEMENT_TRANSITION]?.indentLeftPx),
        '--transition-indent-right': toIndent(blocks[ELEMENT_TRANSITION]?.indentRightChars, blocks[ELEMENT_TRANSITION]?.indentRightPx),
        '--transition-spacing-before': toEm(blocks[ELEMENT_TRANSITION]?.spacingBeforeEm),
        '--transition-line-height': String(blocks[ELEMENT_TRANSITION]?.lineHeight ?? settings.typography.lineHeight),

        // Dual Character
        '--dual-character-indent': toIndent(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.indentLeftChars, blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.indentLeftPx),
        '--dual-character-indent-right': toIndent(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.indentRightChars, blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.indentRightPx),
        '--dual-character-spacing-before': toEm(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.spacingBeforeEm),
        '--dual-character-line-height': String(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.lineHeight ?? settings.typography.lineHeight),

        // Lyrics
        '--lyrics-spacing-before': toEm(blocks[ELEMENT_LYRICS]?.spacingBeforeEm),
        '--lyrics-line-height': String(blocks[ELEMENT_LYRICS]?.lineHeight ?? settings.typography.lineHeight),
        '--lyrics-indent-left': toIndent(blocks[ELEMENT_LYRICS]?.indentLeftChars, blocks[ELEMENT_LYRICS]?.indentLeftPx),
        '--lyrics-indent-right': toIndent(blocks[ELEMENT_LYRICS]?.indentRightChars, blocks[ELEMENT_LYRICS]?.indentRightPx),

        // Centered
        '--centered-spacing-before': toEm(blocks[ELEMENT_CENTERED]?.spacingBeforeEm),
        '--centered-line-height': String(blocks[ELEMENT_CENTERED]?.lineHeight ?? settings.typography.lineHeight),
        '--centered-indent-left': toIndent(blocks[ELEMENT_CENTERED]?.indentLeftChars, blocks[ELEMENT_CENTERED]?.indentLeftPx),
        '--centered-indent-right': toIndent(blocks[ELEMENT_CENTERED]?.indentRightChars, blocks[ELEMENT_CENTERED]?.indentRightPx),

        // Backward compatibility mappings (if any strictly needed by old code not being updated yet)
        '--editor-character-indent': toIndent(blocks[ELEMENT_CHARACTER]?.indentLeftChars, blocks[ELEMENT_CHARACTER]?.indentLeftPx),
        '--editor-character-gap': toEm(blocks[ELEMENT_CHARACTER]?.spacingBeforeEm),
        '--editor-dual-character-indent': toIndent(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.indentLeftChars, blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.indentLeftPx),
        '--editor-dual-character-gap': toEm(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.spacingBeforeEm),
        '--editor-transition-gap': toEm(blocks[ELEMENT_TRANSITION]?.spacingBeforeEm),
        '--editor-transition-indent': toIndent(blocks[ELEMENT_TRANSITION]?.indentLeftChars, blocks[ELEMENT_TRANSITION]?.indentLeftPx),

    } as EditorCssVars;
};
