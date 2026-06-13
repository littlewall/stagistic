import {
    ELEMENT_NOTE,
    ELEMENT_STAGE_DIRECTIONS,
} from '../../fountain/types';
import type {FountainBlockSpec} from '../types';

export const noteSpec = {
    nodeType: 'note',
    blockType: 'note',
    legacyType: ELEMENT_NOTE,
    label: 'Notes',
    listId: 'element-note',
    enterFallback: ELEMENT_STAGE_DIRECTIONS,
    defaultSettings: {
        spacingBeforeEm: 1.0,
        lineHeight: 1.2,
        shortcut: '0',
        nextElement: ELEMENT_STAGE_DIRECTIONS,
        textAlign: 'left',
        casing: 'normal',
        isBold: false,
        isItalic: false,
        isUnderline: false,
    },
} as const satisfies FountainBlockSpec;
