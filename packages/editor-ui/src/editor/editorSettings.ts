import {
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_PARENTHETICAL,
    ELEMENT_TRANSITION,
} from '@stagistic/editor-core';
import {
    DEFAULT_EDITOR_SETTINGS,
    mergeEditorSettings,
    type EditorSettings,
    type EditorSettingsOverride,
    type ScriptDocument,
} from '@stagistic/shared';
import type {CSSProperties} from 'react';

type EditorCssVars = CSSProperties;

const toPx = (value?: number) => (
    typeof value === 'number' ? `${value}px` : undefined
);
const toPxScaled = (value?: number, scale = 1) => (
    typeof value === 'number' ? `${value * scale}px` : undefined
);
const toEm = (value?: number) => (typeof value === 'number' ? `${value}em` : undefined);
const toCharacterIndent = (value?: number) => (
    typeof value === 'number' ? `calc(${value}px + 1em)` : undefined
);

export const resolveEditorSettings = (
    globalOverrides?: EditorSettingsOverride,
    scriptOverrides?: EditorSettingsOverride,
): EditorSettings => mergeEditorSettings(
    DEFAULT_EDITOR_SETTINGS,
    globalOverrides,
    scriptOverrides,
);

export const getEditorCssVars = (settings: EditorSettings, scale = 1): EditorCssVars => {
    const blocks = settings.blocks;

    return {
        '--editor-font-size': toPxScaled(settings.typography.fontSizePx, scale),
        '--editor-line-height': String(settings.typography.lineHeight),
        '--editor-page-width': toPxScaled(settings.page.widthPx, scale),
        '--editor-page-height': toPxScaled(settings.page.heightPx, scale),
        '--editor-page-gap': toPxScaled(settings.page.pageGapPx, scale),
        '--editor-page-break-background': settings.page.pageBreakBackground,
        '--dialogue-indent': toPx(blocks[ELEMENT_DIALOGUE]?.indentLeftPx),
        '--parenthetical-indent-left': toPx(blocks[ELEMENT_PARENTHETICAL]?.indentLeftPx),
        '--parenthetical-indent-right': toPx(blocks[ELEMENT_PARENTHETICAL]?.indentRightPx),
        '--editor-character-indent': toCharacterIndent(blocks[ELEMENT_CHARACTER]?.indentLeftPx),
        '--editor-character-gap': toEm(blocks[ELEMENT_CHARACTER]?.spacingBeforeEm),
        '--editor-dual-character-indent': toPx(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.indentLeftPx),
        '--editor-dual-character-gap': toEm(blocks[ELEMENT_DUAL_DIALOGUE_CHARACTER]?.spacingBeforeEm),
        '--editor-transition-gap': toEm(blocks[ELEMENT_TRANSITION]?.spacingBeforeEm),
    } as EditorCssVars;
};

export const stripScriptSettings = (value: ScriptDocument): ScriptDocument => {
    if (!value.attrs || !('settings' in value.attrs)) {
        return value;
    }

    const {settings, ...restAttrs} = value.attrs ?? {};

    if (settings && Object.keys(settings).length > 0) {
        return value;
    }

    const hasOtherAttrs = Object.keys(restAttrs).length > 0;

    if (!hasOtherAttrs) {
        return {
            type: value.type,
            content: value.content,
        };
    }

    return {
        ...value,
        attrs: restAttrs,
    };
};

export const applyScriptSettings = (
    value: ScriptDocument,
    settings?: EditorSettingsOverride,
): ScriptDocument => {
    if (!settings) {
        return value;
    }

    return {
        ...value,
        attrs: {
            ...value.attrs,
            settings,
        },
    };
};
