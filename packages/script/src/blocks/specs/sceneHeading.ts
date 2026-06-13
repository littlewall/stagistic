import {
    ELEMENT_SCENE_HEADING,
    ELEMENT_STAGE_DIRECTIONS,
} from '../../fountain/types';
import type {FountainBlockSpec} from '../types';

export const sceneHeadingSpec = {
    nodeType: 'sceneHeading',
    blockType: 'scene_heading',
    legacyType: ELEMENT_SCENE_HEADING,
    label: 'Scene heading',
    listId: 'element-scene-heading',
    enterFallback: ELEMENT_STAGE_DIRECTIONS,
    defaultSettings: {
        spacingBeforeEm: 2.0,
        lineHeight: 1.2,
        shortcut: '1',
        nextElement: ELEMENT_STAGE_DIRECTIONS,
        textAlign: 'left',
        casing: 'uppercase',
        isBold: true,
        isItalic: false,
        isUnderline: false,
    },
} as const satisfies FountainBlockSpec;
