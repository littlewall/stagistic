import {
    BLOCK_CASING_OPTIONS,
    BLOCK_SHORTCUT_OPTIONS,
    BLOCK_TEXT_ALIGN_OPTIONS,
    type BlockCasing,
    type BlockShortcut,
    type BlockTextAlign,
    ELEMENT_ACT,
    ELEMENT_ASIDE,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_NOTE,
    ELEMENT_SCENE_HEADING,
    ELEMENT_STAGE_DIRECTIONS,
    type FountainElementType,
} from '@stagistic/script';

const FOUNTAIN_ELEMENT_TYPES = new Set<FountainElementType>([
    ELEMENT_SCENE_HEADING,
    ELEMENT_ACT,
    ELEMENT_STAGE_DIRECTIONS,
    ELEMENT_CHARACTER,
    ELEMENT_ASIDE,
    ELEMENT_DIALOGUE,
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
