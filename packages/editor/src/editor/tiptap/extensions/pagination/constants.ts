
import {type PaginationOptions} from './types';

export const SPLITTABLE_BLOCK_TYPES = new Set([
    "stageDirection",
    "dialogue",
    "lyrics",
    "aside",
]);

export const ORPHAN_PUSHDOWN_TYPES = new Set(["character", "scene"]);

export const MIN_SPLIT_LINES_BEFORE = 2;

export const MIN_SPLIT_LINES_AFTER = 2;

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
