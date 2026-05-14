import type {FountainElementType} from '../../fountain';
import type {BlockSettings, BlockSpacingSettings} from '../../settings';
import {ALL_BLOCK_SPECS} from '../specs';

export const buildDefaultBlockSettings = (): BlockSettings => {
    const map = {} as Record<FountainElementType, BlockSpacingSettings>;

    for (const spec of ALL_BLOCK_SPECS) {
        map[spec.legacyType] = {...spec.defaultSettings};
    }

    return map as BlockSettings;
};
