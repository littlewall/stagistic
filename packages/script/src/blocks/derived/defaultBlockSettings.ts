import type {FountainElementType} from '../../fountain';
import type {BlockSettings, BlockSpacingSettings} from '../../settings';
import {ALL_BLOCK_SPECS} from '../specs';

/**
 * Build the `blocks` portion of DEFAULT_EDITOR_SETTINGS by iterating
 * `ALL_BLOCK_SPECS`. The Partial<> escape hatch lets a caller layer in
 * any synthetic entries (e.g. ELEMENT_DUAL_DIALOGUE, which is a wrapper
 * type that has settings but no spec).
 */
export const buildDefaultBlockSettings = (
    extras?: Partial<Record<FountainElementType, BlockSpacingSettings>>,
): BlockSettings => {
    const map = {} as Record<FountainElementType, BlockSpacingSettings>;

    for (const spec of ALL_BLOCK_SPECS) {
        map[spec.legacyType] = {...spec.defaultSettings};
    }

    if (extras) {
        for (const [legacyType, settings] of Object.entries(extras) as Array<[FountainElementType, BlockSpacingSettings | undefined]>) {
            if (settings) {
                map[legacyType] = {...settings};
            }
        }
    }

    return map as BlockSettings;
};
