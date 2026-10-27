import type {BoardDensity} from '@stagistic/ui';

import {BOARD_PREFERENCES_STORAGE_KEY} from '../../../shared/storageKeys';
import {useLocalPreference} from '../../../shared/useLocalPreference';

export interface BoardPreferences {
    /** Characters the Wall is filtered to; empty shows every scene. */
    characterIds: string[],
    density: BoardDensity,
    showMentioned: boolean,
}

export const DEFAULT_BOARD_PREFERENCES: BoardPreferences = {
    characterIds: [],
    density: 'characters',
    showMentioned: true,
};

const DENSITIES: readonly BoardDensity[] = ['title', 'characters'];

export const parseBoardPreferences = (value: unknown): BoardPreferences | undefined => {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const candidate = value as Partial<Record<keyof BoardPreferences, unknown>>;
    const {
        characterIds,
        density,
        showMentioned,
    } = candidate;

    return {
        characterIds: Array.isArray(characterIds)
            ? characterIds.filter((id): id is string => typeof id === 'string')
            : DEFAULT_BOARD_PREFERENCES.characterIds,
        density: DENSITIES.find(option => option === density) ?? DEFAULT_BOARD_PREFERENCES.density,
        showMentioned: typeof showMentioned === 'boolean' ? showMentioned : DEFAULT_BOARD_PREFERENCES.showMentioned,
    };
};

export const getBoardPreferencesKey = (scriptScope: string) => `${BOARD_PREFERENCES_STORAGE_KEY}:script:${scriptScope}`;

/* Filter, density and the Mentioned switch belong to one script's cast, so they are kept per script. */
export const useBoardPreferences = (scriptScope: string) => useLocalPreference({
    key: getBoardPreferencesKey(scriptScope),
    defaultValue: DEFAULT_BOARD_PREFERENCES,
    parse: parseBoardPreferences,
});
