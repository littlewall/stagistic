import type {BlockSpec} from '../types';

export const actSpec = {
    nodeType: 'act',
    blockType: 'act',
    label: 'ACT',
    listId: 'element-act',
    enterFallback: 'scene',
    defaultSettings: {
        spacingBeforeEm: 1.0,
        spacingAfterEm: 1.0,
        lineHeight: 1.2,
        indentLeftChars: 0,
        nextElement: 'scene',
        textAlign: 'left',
        casing: 'uppercase',
        isBold: true,
        isItalic: false,
        isUnderline: true,
    },
} as const satisfies BlockSpec;
