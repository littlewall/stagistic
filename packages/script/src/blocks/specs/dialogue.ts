import {
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
} from '../../fountain/types';
import type {FountainBlockSpec} from '../types';

export const dialogueSpec = {
    nodeType: 'dialogue',
    blockType: 'dialogue',
    legacyType: ELEMENT_DIALOGUE,
    label: 'Dialogue',
    listId: 'element-dialogue',
    enterFallback: ELEMENT_CHARACTER,
    defaultSettings: {
        spacingBeforeEm: 0,
        lineHeight: 1.2,
        indentLeftChars: 10,
        indentRightChars: 3,
        shortcut: '5',
        nextElement: ELEMENT_CHARACTER,
        textAlign: 'left',
        casing: 'normal',
        isBold: false,
        isItalic: false,
        isUnderline: false,
    },
} as const satisfies FountainBlockSpec;
