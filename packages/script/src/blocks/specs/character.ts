import {
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
} from '../../fountain/types';
import type {FountainBlockSpec} from '../types';

export const characterSpec = {
    nodeType: 'character',
    blockType: 'character',
    legacyType: ELEMENT_CHARACTER,
    label: 'Character',
    listId: 'element-character',
    enterFallback: ELEMENT_DIALOGUE,
    defaultSettings: {
        spacingBeforeEm: 1.0,
        lineHeight: 1.2,
        indentLeftChars: 20,
        indentRightChars: 3,
        shortcut: '3',
        nextElement: ELEMENT_DIALOGUE,
        textAlign: 'left',
        casing: 'uppercase',
        isBold: true,
        isItalic: false,
        isUnderline: false,
    },
} as const satisfies FountainBlockSpec;
