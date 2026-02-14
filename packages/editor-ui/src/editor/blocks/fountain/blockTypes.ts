import {
    ELEMENT_ACTION,
    ELEMENT_CENTERED,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
} from '@stagistic/editor-core';

export const FOUNTAIN_BLOCK_TYPES = [
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_PARENTHETICAL,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_CENTERED,
] as const;

export type FountainBlockType = (typeof FOUNTAIN_BLOCK_TYPES)[number];

const FOUNTAIN_BLOCK_TYPE_SET = new Set<FountainBlockType>(FOUNTAIN_BLOCK_TYPES);

const ENTER_NEXT_TYPE: Partial<Record<FountainBlockType, FountainBlockType>> = {
    [ELEMENT_SCENE_HEADING]: ELEMENT_ACTION,
    [ELEMENT_ACTION]: ELEMENT_ACTION,
    [ELEMENT_CHARACTER]: ELEMENT_DIALOGUE,
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: ELEMENT_DIALOGUE,
    [ELEMENT_PARENTHETICAL]: ELEMENT_CHARACTER,
    [ELEMENT_DIALOGUE]: ELEMENT_CHARACTER,
    [ELEMENT_TRANSITION]: ELEMENT_SCENE_HEADING,
};

const DEFAULT_BLOCK_TYPE: FountainBlockType = ELEMENT_ACTION;

export const isFountainBlockType = (value: unknown): value is FountainBlockType => {
    return typeof value === 'string' && FOUNTAIN_BLOCK_TYPE_SET.has(value as FountainBlockType);
};

export const normalizeFountainBlockType = (value: unknown): FountainBlockType => {
    if (value === 'fountain_lyric' || value === 'lyrics') {
        return ELEMENT_LYRICS;
    }

    if (value === ELEMENT_DUAL_DIALOGUE) {
        return ELEMENT_DIALOGUE;
    }

    return isFountainBlockType(value) ? value : DEFAULT_BLOCK_TYPE;
};

export const getNextTypeOnEnter = (type: FountainBlockType) => ENTER_NEXT_TYPE[type] ?? type;
