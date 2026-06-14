import type {BlockSettings, BlockSpacingSettings} from '../../settings';
import {ALL_BLOCK_SPECS} from '../specs';

export const buildDefaultBlockSettings = (): BlockSettings => {
    const map: Record<string, BlockSpacingSettings> = {};

    for (const spec of ALL_BLOCK_SPECS) {
        map[spec.nodeType] = {...spec.defaultSettings};
    }

    return map;
};
