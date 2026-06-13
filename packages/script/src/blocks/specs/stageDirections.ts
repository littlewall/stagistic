import {ELEMENT_STAGE_DIRECTIONS} from '../../fountain/types';
import type {FountainBlockSpec} from '../types';

export const stageDirectionsSpec = {
    nodeType: 'action',
    blockType: 'action',
    legacyType: ELEMENT_STAGE_DIRECTIONS,
    label: 'Stage directions',
    listId: 'element-action',
    enterFallback: ELEMENT_STAGE_DIRECTIONS,
    defaultSettings: {
        spacingBeforeEm: 1.0,
        lineHeight: 1.2,
        shortcut: '2',
        nextElement: ELEMENT_STAGE_DIRECTIONS,
        textAlign: 'left',
        casing: 'normal',
        isBold: false,
        isItalic: false,
        isUnderline: false,
    },
} as const satisfies FountainBlockSpec;
