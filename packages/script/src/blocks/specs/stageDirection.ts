import type {BlockSpec} from '../types';

export const stageDirectionSpec = {
    nodeType: 'stageDirection',
    blockType: 'stage_direction',
    label: 'Stage direction',
    listId: 'element-stage-direction',
    enterFallback: 'stageDirection',
    defaultSettings: {
        spacingBeforeEm: 1.0,
        lineHeight: 1.2,
        shortcut: '2',
        nextElement: 'stageDirection',
        textAlign: 'left',
        casing: 'normal',
        isBold: false,
        isItalic: false,
        isUnderline: false,
    },
} as const satisfies BlockSpec;
