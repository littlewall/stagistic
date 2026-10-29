import {BOARD_PREFERENCES_STORAGE_KEY} from '../../../shared/storageKeys';
import {useLocalPreference} from '../../../shared/useLocalPreference';

export interface BoardPreferences {
    /** Characters the Wall is filtered to; empty shows every scene. */
    characterIds: string[],
    /** Whether cards list the characters on stage. */
    showOnStage: boolean,
}

export const DEFAULT_BOARD_PREFERENCES: BoardPreferences = {
    characterIds: [],
    showOnStage: true,
};

export const parseBoardPreferences = (value: unknown): BoardPreferences | undefined => {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const candidate = value as Partial<Record<keyof BoardPreferences, unknown>>;
    const {
        characterIds,
        showOnStage,
    } = candidate;

    return {
        characterIds: Array.isArray(characterIds)
            ? characterIds.filter((id): id is string => typeof id === 'string')
            : DEFAULT_BOARD_PREFERENCES.characterIds,
        showOnStage: typeof showOnStage === 'boolean' ? showOnStage : DEFAULT_BOARD_PREFERENCES.showOnStage,
    };
};

export const getBoardPreferencesKey = (scriptScope: string) => `${BOARD_PREFERENCES_STORAGE_KEY}:script:${scriptScope}`;

/* Filter and card options belong to one script's cast, so they are kept per script. */
export const useBoardPreferences = (scriptScope: string) => useLocalPreference({
    key: getBoardPreferencesKey(scriptScope),
    defaultValue: DEFAULT_BOARD_PREFERENCES,
    parse: parseBoardPreferences,
});
