import {buildFountainBlockItems} from '../blocks/derived/blockItems';
import type {FountainElementType} from './types';

export type FountainBlockMeta = {
    id: string,
    type: FountainElementType,
    label: string,
};

/**
 * Derived from ALL_BLOCK_SPECS (see packages/script/src/blocks/). To add
 * a new entry, add a FountainBlockSpec; do not edit this list directly.
 */
export const FOUNTAIN_BLOCK_ITEMS: FountainBlockMeta[] = buildFountainBlockItems();
