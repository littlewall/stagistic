import {ELEMENT_LYRICS} from '../../fountain/types';
import type {FountainBlockSpec} from '../types';

export const lyricsSpec = {
    nodeType: 'lyrics',
    blockType: 'lyrics',
    legacyType: ELEMENT_LYRICS,
    label: 'Lyrics',
    listId: 'element-lyrics',
    enterFallback: ELEMENT_LYRICS,
    defaultSettings: {
        spacingBeforeEm: 0,
        lineHeight: 1.2,
        indentLeftChars: 10,
        indentRightChars: 10,
        shortcut: '7',
        nextElement: ELEMENT_LYRICS,
        textAlign: 'left',
        casing: 'normal',
        isBold: false,
        isItalic: true,
        isUnderline: false,
    },
} as const satisfies FountainBlockSpec;
