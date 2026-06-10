import {useCallback} from 'react';

import type {
    CharacterGenderOption,
    ScriptCharacterRecord,
} from '../types';
import type {
    CharacterActionSharedArgs,
    SetCharacterGenderOptionsState,
    SetStringArrayState,
} from './types';
import {runCharacterFieldUpdate} from './utils';

interface UseSetCharacterGenderArgs extends CharacterActionSharedArgs {
    confirmedCharactersById: ReadonlyMap<string, ScriptCharacterRecord>,
    setGenderUpdatingCharacterIds: SetStringArrayState,
    setCharacterGenderOptions: SetCharacterGenderOptionsState,
}

interface SetCharacterGenderActions {
    handleSetCharacterGender: (characterId: string, genderKey: string | null) => void,
    handleUpsertCharacterGender: (label: string) => Promise<CharacterGenderOption | null>,
}

const mergeCharacterGenderOptions = (
    current: CharacterGenderOption[],
    option: CharacterGenderOption,
): CharacterGenderOption[] => {
    const byKey = new Map<string, CharacterGenderOption>();

    current.forEach(item => {
        byKey.set(item.key, item);
    });
    byKey.set(option.key, option);

    return Array.from(byKey.values())
        .sort((a, b) => a.label.localeCompare(b.label));
};

export const useSetCharacterGender = ({
    currentScriptId,
    scriptRepository,
    setConfirmedCharacterRecords,
    confirmedCharactersById,
    setGenderUpdatingCharacterIds,
    setCharacterGenderOptions,
}: UseSetCharacterGenderArgs): SetCharacterGenderActions => {
    const handleSetCharacterGender = useCallback((characterId: string, genderKey: string | null) => {
        if (!currentScriptId || !characterId) {
            return;
        }

        if (!confirmedCharactersById.has(characterId)) {
            return;
        }

        void runCharacterFieldUpdate({
            characterId,
            currentScriptId,
            scriptRepository,
            setConfirmedCharacterRecords,
            setPendingIds: setGenderUpdatingCharacterIds,
            apiCall: () => scriptRepository.setScriptCharacterGender(currentScriptId, characterId, genderKey),
            errorLabel: 'Failed to set character gender',
        });
    }, [
        confirmedCharactersById,
        currentScriptId,
        scriptRepository,
        setConfirmedCharacterRecords,
        setGenderUpdatingCharacterIds,
    ]);

    const handleUpsertCharacterGender = useCallback(async (label: string) => {
        if (!currentScriptId) {
            return null;
        }

        try {
            const option = await scriptRepository.upsertScriptCharacterGender(currentScriptId, label);

            if (!option) {
                return null;
            }

            setCharacterGenderOptions(previous => mergeCharacterGenderOptions(previous, option));

            return option;
        } catch (error) {
            console.error('Failed to upsert character gender option', error);

            try {
                const storedOptions = await scriptRepository.listScriptCharacterGenders(currentScriptId);

                setCharacterGenderOptions(previous => {
                    const byKey = new Map<string, CharacterGenderOption>();

                    previous.forEach(item => {
                        byKey.set(item.key, item);
                    });
                    storedOptions.forEach(item => {
                        byKey.set(item.key, item);
                    });

                    return Array.from(byKey.values())
                        .sort((a, b) => a.label.localeCompare(b.label));
                });
            } catch (refreshError) {
                console.error('Failed to refresh character gender options after upsert failure', refreshError);
            }

            return null;
        }
    }, [
        currentScriptId,
        scriptRepository,
        setCharacterGenderOptions,
    ]);

    return {
        handleSetCharacterGender,
        handleUpsertCharacterGender,
    };
};
