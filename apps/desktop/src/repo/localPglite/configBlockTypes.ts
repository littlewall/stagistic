import {
    BLOCK_CASING_OPTIONS,
    BLOCK_SHORTCUT_OPTIONS,
    BLOCK_TEXT_ALIGN_OPTIONS,
    type BlockCasing,
    type BlockShortcut,
    type BlockTextAlign,
    ELEMENT_ACT,
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_NOTE,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_SECTION,
    ELEMENT_TRANSITION,
    type FountainElementType,
} from '@stagistic/script-core';

const FOUNTAIN_ELEMENT_TYPES = new Set<FountainElementType>([
    ELEMENT_SCENE_HEADING,
    ELEMENT_ACT,
    ELEMENT_SECTION,
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_PARENTHETICAL,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_TRANSITION,
    ELEMENT_LYRICS,
    ELEMENT_NOTE,
]);

const isFountainElementType = (value: unknown): value is FountainElementType => {
    return typeof value === 'string' && FOUNTAIN_ELEMENT_TYPES.has(value as FountainElementType);
};

export const normalizeSettingsBlockType = (value: unknown): FountainElementType | null => {
    if (value === 'fountain_lyric' || value === 'lyrics') {
        return ELEMENT_LYRICS;
    }

    if (value === ELEMENT_DUAL_DIALOGUE) {
        return ELEMENT_DIALOGUE;
    }

    return isFountainElementType(value) ? value : null;
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
