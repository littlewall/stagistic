import {
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
} from '../../fountain/types';
import type {FountainBlockSpec} from '../types';

export const transitionSpec = {
    nodeType: 'transition',
    blockType: 'transition',
    legacyType: ELEMENT_TRANSITION,
    label: 'Transition',
    listId: 'element-transition',
    enterFallback: ELEMENT_SCENE_HEADING,
    defaultSettings: {
        spacingBeforeEm: 1.0,
        lineHeight: 1.2,
        indentRightChars: 5,
        shortcut: '6',
        nextElement: ELEMENT_SCENE_HEADING,
        textAlign: 'right',
        casing: 'uppercase',
        isBold: true,
        isItalic: false,
        isUnderline: false,
    },
} as const satisfies FountainBlockSpec;
