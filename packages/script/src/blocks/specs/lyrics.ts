import type {BlockSpec} from '../types';

export const lyricsSpec = {
    nodeType: 'lyrics',
    blockType: 'lyrics',
    label: 'Lyrics',
    listId: 'element-lyrics',
    enterFallback: 'lyrics',
    defaultSettings: {
        spacingBeforeEm: 0,
        lineHeight: 1.2,
        indentLeftChars: 10,
        indentRightChars: 10,
        shortcut: '7',
        nextElement: 'lyrics',
        textAlign: 'left',
        casing: 'uppercase',
        isBold: false,
        isItalic: true,
        isUnderline: false,
    },
} as const satisfies BlockSpec;
