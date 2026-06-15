import {
    BLOCK_CASING_OPTIONS,
    BLOCK_SHORTCUT_OPTIONS,
    BLOCK_TEXT_ALIGN_OPTIONS,
    type BlockCasing,
    type BlockShortcut,
    type BlockTextAlign,
    isScriptBlockType,
    resolveScriptBlockType,
    type ScriptBlockType,
} from '@stagistic/script';

export const normalizeSettingsBlockType = (value: unknown): ScriptBlockType | null => {
    return typeof value === 'string' ? resolveScriptBlockType(value) : null;
};

export const isKnownBlockType = (value: unknown): value is ScriptBlockType => {
    return isScriptBlockType(value);
};

export const isBlockTextAlign = (value: unknown): value is BlockTextAlign => {
    return typeof value === 'string' && BLOCK_TEXT_ALIGN_OPTIONS.includes(value as BlockTextAlign);
};

export const isBlockCasing = (value: unknown): value is BlockCasing => {
    return typeof value === 'string' && BLOCK_CASING_OPTIONS.includes(value as BlockCasing);
};

export const isBlockShortcut = (value: unknown): value is BlockShortcut => {
    return typeof value === 'string' && BLOCK_SHORTCUT_OPTIONS.includes(value as BlockShortcut);
};
