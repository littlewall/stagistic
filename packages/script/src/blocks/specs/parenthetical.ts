import {
    ELEMENT_CHARACTER,
    ELEMENT_PARENTHETICAL,
} from '../../fountain/types';
import type {FountainBlockSpec} from '../types';

export const parentheticalSpec = {
    nodeType: 'parenthetical',
    blockType: 'parenthetical',
    legacyType: ELEMENT_PARENTHETICAL,
    label: 'Aside',
    listId: 'element-parenthetical',
    enterFallback: ELEMENT_CHARACTER,
    defaultSettings: {
        spacingBeforeEm: 0,
        lineHeight: 1.2,
        indentLeftChars: 16,
        indentRightChars: 21,
        shortcut: '4',
        nextElement: ELEMENT_CHARACTER,
        textAlign: 'left',
        casing: 'lowercase',
        isBold: false,
        isItalic: true,
        isUnderline: false,
    },
} as const satisfies FountainBlockSpec;
