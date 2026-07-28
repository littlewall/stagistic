import type {BlockSpec} from '../types';

export const characterSpec = {
    nodeType: 'character',
    blockType: 'character',
    label: 'Character',
    listId: 'element-character',
    enterFallback: 'dialogue',
    defaultSettings: {
        spacingBeforeEm: 1.0,
        lineHeight: 1.2,
        indentLeftChars: 30,
        indentRightChars: 3,
        shortcut: '3',
        nextElement: 'dialogue',
        textAlign: 'left',
        casing: 'uppercase',
        isBold: true,
        isItalic: false,
        isUnderline: false,
    },
} as const satisfies BlockSpec;
