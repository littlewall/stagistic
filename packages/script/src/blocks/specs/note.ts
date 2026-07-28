import type {BlockSpec} from '../types';

export const noteSpec = {
    nodeType: 'note',
    blockType: 'note',
    label: 'Notes',
    listId: 'element-note',
    enterFallback: 'stageDirection',
    defaultSettings: {
        spacingBeforeEm: 1.0,
        lineHeight: 1.2,
        shortcut: '0',
        nextElement: 'stageDirection',
        textAlign: 'left',
        casing: 'normal',
        isBold: false,
        isItalic: false,
        isUnderline: false,
    },
} as const satisfies BlockSpec;
