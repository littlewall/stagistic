import type {FountainElementType} from '../../fountain/types';
import {ALL_BLOCK_SPECS} from '../specs';

const buildEnterFallbackByLegacyType = (): Partial<Record<FountainElementType, FountainElementType>> => {
    const map: Partial<Record<FountainElementType, FountainElementType>> = {};

    for (const spec of ALL_BLOCK_SPECS) {
        map[spec.legacyType] = spec.enterFallback;
    }

    return map;
};

const ENTER_FALLBACK_BY_LEGACY_TYPE = buildEnterFallbackByLegacyType();

/**
 * Hardcoded default for the block type a user lands on after pressing
 * Enter from `blockType`, when no user setting overrides it. Resolved
 * from FountainBlockSpec.enterFallback. Unknown types fall back to the
 * input type (the user stays on the same block).
 */
export const getEnterFallback = (blockType: FountainElementType): FountainElementType => {
    return ENTER_FALLBACK_BY_LEGACY_TYPE[blockType] ?? blockType;
};
