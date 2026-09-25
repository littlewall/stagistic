import type {BlockSpec} from '../types';

export const asideSpec = {
    nodeType: 'aside',
    blockType: 'aside',
    label: 'Aside',
    listId: 'element-aside',
    enterFallback: 'character',
    defaultSettings: {
        spacingBeforeEm: 0,
        lineHeight: 1.2,
        indentLeftChars: 16,
        indentRightChars: 12,
        shortcut: '4',
        nextElement: 'dialogue',
        textAlign: 'left',
        casing: 'lowercase',
        isBold: false,
        isItalic: true,
        isUnderline: false,
    },
} as const satisfies BlockSpec;
