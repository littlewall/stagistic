import type {FountainBlockMeta} from '../../fountain/fountainBlocks';
import {ALL_BLOCK_SPECS} from '../specs';

/**
 * Derived list of block items used by toolbar/menu UI. Each entry maps
 * to a FountainBlockSpec; order follows ALL_BLOCK_SPECS.
 */
export const buildFountainBlockItems = (): FountainBlockMeta[] => {
    return ALL_BLOCK_SPECS.map(spec => ({
        id: spec.listId,
        type: spec.legacyType,
        label: spec.label,
    }));
};
