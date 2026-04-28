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
} from '@stagistic/script';
import {normalizeEditorSettingsBlockType} from '@stagistic/script';

export const FOUNTAIN_BLOCK_TYPES = [
    ELEMENT_ACT,
    ELEMENT_SECTION,
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_PARENTHETICAL,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_NOTE,
] as const;

export type FountainBlockType = (typeof FOUNTAIN_BLOCK_TYPES)[number];

const FOUNTAIN_BLOCK_TYPE_SET = new Set<FountainBlockType>(FOUNTAIN_BLOCK_TYPES);

const ENTER_NEXT_TYPE: Partial<Record<FountainBlockType, FountainBlockType>> = {
    [ELEMENT_ACT]: ELEMENT_SCENE_HEADING,
    [ELEMENT_SECTION]: ELEMENT_ACTION,
    [ELEMENT_SCENE_HEADING]: ELEMENT_ACTION,
    [ELEMENT_ACTION]: ELEMENT_ACTION,
    [ELEMENT_CHARACTER]: ELEMENT_DIALOGUE,
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: ELEMENT_DIALOGUE,
    [ELEMENT_PARENTHETICAL]: ELEMENT_CHARACTER,
    [ELEMENT_DIALOGUE]: ELEMENT_CHARACTER,
    [ELEMENT_TRANSITION]: ELEMENT_SCENE_HEADING,
    [ELEMENT_NOTE]: ELEMENT_ACTION,
};

const DEFAULT_BLOCK_TYPE: FountainBlockType = ELEMENT_ACTION;

export const isFountainBlockType = (value: unknown): value is FountainBlockType => {
    return typeof value === 'string' && FOUNTAIN_BLOCK_TYPE_SET.has(value as FountainBlockType);
};

export const normalizeFountainBlockType = (value: unknown): FountainBlockType => {
    const normalized = normalizeEditorSettingsBlockType(value);

    return normalized && isFountainBlockType(normalized)
        ? normalized
        : DEFAULT_BLOCK_TYPE;
};

export const getNextTypeOnEnter = (type: FountainBlockType) => ENTER_NEXT_TYPE[type] ?? type;
