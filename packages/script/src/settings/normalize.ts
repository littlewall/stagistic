import {
    ELEMENT_ACT,
    ELEMENT_ASIDE,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_NOTE,
    ELEMENT_SCENE_HEADING,
    ELEMENT_STAGE_DIRECTIONS,
    type FountainElementType,
} from '../fountain';

const EDITOR_SETTINGS_BLOCK_TYPES = new Set<FountainElementType>([
    ELEMENT_SCENE_HEADING,
    ELEMENT_ACT,
    ELEMENT_STAGE_DIRECTIONS,
    ELEMENT_CHARACTER,
    ELEMENT_ASIDE,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_NOTE,
]);

export const normalizeEditorSettingsBlockType = (value: unknown): FountainElementType | null => {
    if (typeof value !== 'string') {
        return null;
    }

    if (value === 'fountain_lyric' || value === 'lyrics') {
        return ELEMENT_LYRICS;
    }

    return EDITOR_SETTINGS_BLOCK_TYPES.has(value as FountainElementType)
        ? value as FountainElementType
        : null;
};
