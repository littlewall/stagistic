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
    type FountainElementType,
} from '../fountain';

export type FountainBlockMeta = {
    id: string,
    type: FountainElementType,
    label: string,
};

export const FOUNTAIN_BLOCK_ITEMS: FountainBlockMeta[] = [
    {
        id: 'element-scene-heading',
        type: ELEMENT_SCENE_HEADING,
        label: 'Scene heading',
    },
    {
        id: 'element-act',
        type: ELEMENT_ACT,
        label: 'ACT',
    },
    {
        id: 'element-section',
        type: ELEMENT_SECTION,
        label: 'Section',
    },
    {
        id: 'element-action',
        type: ELEMENT_ACTION,
        label: 'Action',
    },
    {
        id: 'element-character',
        type: ELEMENT_CHARACTER,
        label: 'Character',
    },
    {
        id: 'element-parenthetical',
        type: ELEMENT_PARENTHETICAL,
        label: 'Parenthetical',
    },
    {
        id: 'element-dialogue',
        type: ELEMENT_DIALOGUE,
        label: 'Dialogue',
    },
    {
        id: 'element-lyrics',
        type: ELEMENT_LYRICS,
        label: 'Lyrics',
    },
    {
        id: 'element-transition',
        type: ELEMENT_TRANSITION,
        label: 'Transition',
    },
    {
        id: 'element-dual-character',
        type: ELEMENT_DUAL_DIALOGUE_CHARACTER,
        label: 'Character (dual)',
    },
    {
        id: 'element-note',
        type: ELEMENT_NOTE,
        label: 'Notes',
    },
];
