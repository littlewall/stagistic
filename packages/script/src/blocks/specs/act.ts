import {
    ELEMENT_ACT,
    ELEMENT_SCENE_HEADING,
} from '../../fountain/types';
import type {FountainBlockSpec} from '../types';

export const actSpec = {
    nodeType: 'act',
    blockType: 'act',
    legacyType: ELEMENT_ACT,
    label: 'ACT',
    listId: 'element-act',
    enterFallback: ELEMENT_SCENE_HEADING,
    defaultSettings: {
        spacingBeforeEm: 1.0,
        spacingAfterEm: 1.0,
        lineHeight: 1.2,
        indentLeftChars: 0,
        nextElement: ELEMENT_SCENE_HEADING,
        textAlign: 'left',
        casing: 'uppercase',
        isBold: true,
        isItalic: false,
        isUnderline: true,
    },
} as const satisfies FountainBlockSpec;
