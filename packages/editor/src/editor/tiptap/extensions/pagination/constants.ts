import {
    ELEMENT_ASIDE,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_SCENE_HEADING,
    ELEMENT_STAGE_DIRECTIONS,
} from '@stagistic/script';

import {type PaginationOptions} from './types';

export const SPLITTABLE_BLOCK_TYPES = new Set([
    ELEMENT_STAGE_DIRECTIONS,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_ASIDE,
]);

export const MORE_CONTD_BLOCK_TYPES = new Set([
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_ASIDE,
]);

export const ORPHAN_PUSHDOWN_TYPES = new Set([ELEMENT_CHARACTER, ELEMENT_SCENE_HEADING]);

/** A block splits only when at least this many lines stay on the ending page… */
export const MIN_SPLIT_LINES_BEFORE = 2;

/** …and at least this many lines carry over to the next page (Final Draft convention). */
export const MIN_SPLIT_LINES_AFTER = 2;

/** Tolerance for sub-pixel measurement noise in fit checks. */
export const FIT_EPSILON_PX = 1;

export const DEFAULT_OPTIONS: PaginationOptions = {
    pageHeight: 1123,
    pageWidth: 794,
    marginTop: 95,
    marginBottom: 95,
    marginLeft: 76,
    marginRight: 76,
    lineHeightPx: 22,
    dividerColor: 'var(--color-divider)',
    dividerThickness: 1,
    dividerInsetPx: 96,
};
