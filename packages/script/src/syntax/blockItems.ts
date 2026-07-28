import {buildBlockItems} from '../blocks/derived/blockItems';

export type {BlockMeta} from '../blocks/derived/blockItems';

/**
 * Derived from ALL_BLOCK_SPECS (see packages/script/src/blocks/). To add
 * a new entry, add a BlockSpec; do not edit this list directly.
 */
export const BLOCK_ITEMS = buildBlockItems();
