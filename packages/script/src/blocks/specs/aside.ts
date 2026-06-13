import {
    ELEMENT_ASIDE,
    ELEMENT_CHARACTER,
} from '../../fountain/types';
import type {FountainBlockSpec} from '../types';

export const asideSpec = {
    nodeType: 'parenthetical',
    blockType: 'parenthetical',
    legacyType: ELEMENT_ASIDE,
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
