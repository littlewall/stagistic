import {
    ELEMENT_ACT,
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_NOTE,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
    type FountainElementType,
} from '../fountain';

const EDITOR_SETTINGS_BLOCK_TYPES = new Set<FountainElementType>([
    ELEMENT_SCENE_HEADING,
    ELEMENT_ACT,
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_PARENTHETICAL,
    ELEMENT_DIALOGUE,
    ELEMENT_TRANSITION,
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
