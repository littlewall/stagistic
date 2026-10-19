import type {BlockSpacingSettings, EditorSettings} from '@stagistic/script';
import type {CSSProperties} from 'react';

import {ALL_BLOCK_BINDINGS} from '../blocks/registry';

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
const toCasing = (value?: 'normal' | 'uppercase' | 'lowercase') => {
    if (value === 'uppercase' || value === 'lowercase') {
        return value;
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
/**
 * Standard per-block CSS variables emitted for every binding. The 10
 * variables below are uniform across all block types: padding/indent,
 * line height, alignment, casing, font weight/style, and underline.
 */
const buildStandardBlockVars = (prefix: string, block: BlockSpacingSettings | undefined, fallbackLineHeight: number): Record<string, string | undefined> => {
    return {
        [`--${prefix}-spacing-before`]: toEm(block?.spacingBeforeEm),
        [`--${prefix}-spacing-after`]: toEm(block?.spacingAfterEm),
        [`--${prefix}-line-height`]: String(block?.lineHeight ?? fallbackLineHeight),
        [`--${prefix}-indent-left`]: toIndent(block?.indentLeftChars, block?.indentLeftPx),
        [`--${prefix}-indent-right`]: toIndent(block?.indentRightChars, block?.indentRightPx),
        [`--${prefix}-align`]: toTextAlign(block?.textAlign),
        [`--${prefix}-casing`]: toCasing(block?.casing),
        [`--${prefix}-font-weight`]: toFontWeight(block?.isBold),
        [`--${prefix}-font-style`]: toFontStyle(block?.isItalic),
        [`--${prefix}-underline`]: toUnderline(block?.isUnderline),
    };
};

export const getEditorCssVars = (settings: EditorSettings, scale = 1, editorZoom = 1): EditorCssVars => {
    const blocks = settings.blocks;
    const baseLineHeight = settings.typography.lineHeight;
    const vars: Record<string, string | undefined> = {
        '--editor-zoom': String(editorZoom),
        '--editor-font-size': toPxScaled(settings.typography.fontSizePx, scale),
        '--editor-line-height': String(baseLineHeight),
        '--editor-page-width': toPxScaled(settings.page.widthPx, scale),
        '--editor-page-height': toPxScaled(settings.page.heightPx, scale),
        '--editor-margin-top': toPxScaled(settings.page.marginTopPx, scale),
        '--editor-margin-right': toPxScaled(settings.page.marginRightPx, scale),
        '--editor-margin-bottom': toPxScaled(settings.page.marginBottomPx, scale),
        '--editor-margin-left': toPxScaled(settings.page.marginLeftPx, scale),
        '--editor-page-gap': toPxScaled(settings.page.pageGapPx, scale),
        '--editor-page-break-background': settings.page.pageBreakBackground,
    };

    /*
     * Standard 9 vars per block, emitted from each binding's cssVarPrefix.
     */
    for (const binding of ALL_BLOCK_BINDINGS) {
        const blockSettings = blocks[binding.spec.nodeType];
        const standard = buildStandardBlockVars(binding.cssVarPrefix, blockSettings, baseLineHeight);

        Object.assign(vars, standard);
    }

    const actLineHeight = blocks.act?.lineHeight ?? baseLineHeight;

    vars['--act-line-height'] = String(actLineHeight);

    return vars;
};
