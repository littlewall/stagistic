import {
    DEFAULT_EDITOR_SETTINGS,
    type EditorSettingsOverride,
    mergeEditorSettings,
} from '@stagistic/script';

export const getScriptLayoutFingerprint = (settings?: EditorSettingsOverride | null): string => {
    const resolved = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, settings);

    return JSON.stringify({
        page: {
            widthPx: resolved.page.widthPx,
            heightPx: resolved.page.heightPx,
            marginTopPx: resolved.page.marginTopPx,
            marginRightPx: resolved.page.marginRightPx,
            marginBottomPx: resolved.page.marginBottomPx,
            marginLeftPx: resolved.page.marginLeftPx,
            contentMarginTopPx: resolved.page.contentMarginTopPx,
            contentMarginBottomPx: resolved.page.contentMarginBottomPx,
        },
        typography: resolved.typography,
        structure: resolved.structure,
        blocks: Object.entries(resolved.blocks).sort(([a], [b]) => a.localeCompare(b)).map(([type, block]) => ({
            type,
            spacingBeforeEm: block.spacingBeforeEm,
            lineHeight: block.lineHeight,
            indentLeftChars: block.indentLeftChars,
            indentRightChars: block.indentRightChars,
            textAlign: block.textAlign,
            casing: block.casing,
            isBold: block.isBold,
            isItalic: block.isItalic,
            isUnderline: block.isUnderline,
        })),
    });
};
