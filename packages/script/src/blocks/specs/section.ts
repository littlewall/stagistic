import {
    ELEMENT_ACTION,
    ELEMENT_SECTION,
} from '../../fountain/types';
import type {FountainBlockSpec} from '../types';

export const sectionSpec = {
    nodeType: 'section',
    blockType: 'section',
    legacyType: ELEMENT_SECTION,
    label: 'Section',
    listId: 'element-section',
    enterFallback: ELEMENT_ACTION,
    defaultSettings: {
        spacingBeforeEm: 1.0,
        lineHeight: 1.2,
        nextElement: ELEMENT_ACTION,
        textAlign: 'left',
        casing: 'uppercase',
        isBold: true,
        isItalic: false,
        isUnderline: false,
    },
} as const satisfies FountainBlockSpec;
