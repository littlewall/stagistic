import {
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
} from '../../fountain/types';
import type {FountainBlockSpec} from '../types';

export const dualDialogueCharacterSpec = {
    nodeType: 'dualDialogueCharacter',
    blockType: 'dual_dialogue_character',
    legacyType: ELEMENT_DUAL_DIALOGUE_CHARACTER,
    label: 'Character (dual)',
    listId: 'element-dual-character',
    enterFallback: ELEMENT_DIALOGUE,
    defaultSettings: {
        spacingBeforeEm: 1.0,
        lineHeight: 1.2,
        indentLeftChars: 20,
        indentRightChars: 3,
        shortcut: '9',
        nextElement: ELEMENT_DIALOGUE,
        textAlign: 'left',
        casing: 'uppercase',
        isBold: true,
        isItalic: false,
        isUnderline: false,
    },
} as const satisfies FountainBlockSpec;
