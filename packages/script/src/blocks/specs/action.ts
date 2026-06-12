import {ELEMENT_ACTION} from '../../fountain/types';
import type {FountainBlockSpec} from '../types';

export const actionSpec = {
    nodeType: 'action',
    blockType: 'action',
    legacyType: ELEMENT_ACTION,
    label: 'Stage directions',
    listId: 'element-action',
    enterFallback: ELEMENT_ACTION,
    defaultSettings: {
        spacingBeforeEm: 1.0,
        lineHeight: 1.2,
        shortcut: '2',
        nextElement: ELEMENT_ACTION,
        textAlign: 'left',
        casing: 'normal',
        isBold: false,
        isItalic: false,
        isUnderline: false,
    },
} as const satisfies FountainBlockSpec;
