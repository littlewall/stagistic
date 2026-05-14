import {buildDefaultBlockSettings} from '../blocks/derived/defaultBlockSettings';
import {
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE,
} from '../fountain';
import {CHARACTER_COLOR_SATURATION_DEFAULT} from './options';
import type {EditorSettings} from './types';

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
    page: {
        widthPx: 794,
        heightPx: 1123,
        marginTopPx: 96,
        marginRightPx: 96,
        marginBottomPx: 96,
        marginLeftPx: 144,
        pageGapPx: 32,
        pageBreakBackground: 'var(--color-surface)',
        contentMarginTopPx: 0,
        contentMarginBottomPx: 0,
    },
    typography: {
        fontSizePx: 16,
        lineHeight: 1.2,
    },
    visual: {
        characterColorSaturation: CHARACTER_COLOR_SATURATION_DEFAULT,
    },
    structure: {
        actDisplay: {
            linesBefore: 1,
            linesAfter: 1,
        },
    },
    /*
     * Block defaults come from FountainBlockSpec entries (one spec per
     * block type). ELEMENT_DUAL_DIALOGUE is a synthetic wrapper type
     * with no node of its own, so its settings are added here as an
     * extra entry — kept identical to ELEMENT_DIALOGUE settings for
     * backward compatibility.
     */
    blocks: buildDefaultBlockSettings({
        [ELEMENT_DUAL_DIALOGUE]: {
            spacingBeforeEm: 0,
            lineHeight: 1.2,
            indentLeftChars: 10,
            indentRightChars: 3,
            shortcut: '5',
            nextElement: ELEMENT_CHARACTER,
            textAlign: 'left',
            casing: 'normal',
            isBold: false,
            isItalic: false,
            isUnderline: false,
        },
    }),
};
