import type {BlockSpec} from '../types';

export const sceneSpec = {
    nodeType: 'scene',
    blockType: 'scene',
    label: 'Scene',
    listId: 'element-scene',
    enterFallback: 'stageDirection',
    defaultSettings: {
        spacingBeforeEm: 1.0,
        lineHeight: 1.2,
        shortcut: '1',
        nextElement: 'stageDirection',
        textAlign: 'left',
        casing: 'uppercase',
        isBold: true,
        isItalic: false,
        isUnderline: true,
        sceneNumberFormat: 'dot',
    },
} as const satisfies BlockSpec;
