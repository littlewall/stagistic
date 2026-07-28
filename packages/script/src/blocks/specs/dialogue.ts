import type {BlockSpec} from '../types';

export const dialogueSpec = {
    nodeType: 'dialogue',
    blockType: 'dialogue',
    label: 'Dialogue',
    listId: 'element-dialogue',
    enterFallback: 'character',
    defaultSettings: {
        spacingBeforeEm: 0,
        lineHeight: 1.2,
        indentLeftChars: 10,
        indentRightChars: 3,
        shortcut: '5',
        nextElement: 'character',
        textAlign: 'left',
        casing: 'normal',
        isBold: false,
        isItalic: false,
        isUnderline: false,
    },
} as const satisfies BlockSpec;
