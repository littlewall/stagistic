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
import {
    addPendingValue,
    removePendingValue,
} from './utils';

type UseSetCharacterGenderArgs = CharacterActionSharedArgs & {
    confirmedCharactersById: ReadonlyMap<string, ScriptCharacterRecord>,
    setGenderUpdatingCharacterIds: SetStringArrayState,
    setCharacterGenderOptions: SetCharacterGenderOptionsState,
};

type SetCharacterGenderActions = {
    handleSetCharacterGender: (characterId: string, genderKey: string | null) => void,
    handleUpsertCharacterGender: (label: string) => Promise<CharacterGenderOption | null>,
};

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

        setGenderUpdatingCharacterIds(previous => addPendingValue(previous, characterId));

        const run = async () => {
            try {
                const updatedCharacter = await scriptRepository.setScriptCharacterGender(
                    currentScriptId,
                    characterId,
                    genderKey,
                );

                if (!updatedCharacter) {
                    const storedCharacters = await scriptRepository.listScriptCharacters(currentScriptId);

                    setConfirmedCharacterRecords(storedCharacters);

                    return;
                }

                setConfirmedCharacterRecords(previous => {
                    const next = previous
                        .filter(character => character.id !== characterId && character.id !== updatedCharacter.id);

                    next.push(updatedCharacter);

                    return next;
                });
            } catch (error) {
                console.error('Failed to set character gender', error);

                try {
                    const storedCharacters = await scriptRepository.listScriptCharacters(currentScriptId);

                    setConfirmedCharacterRecords(storedCharacters);
                } catch (refreshError) {
                    console.error('Failed to refresh script characters after gender update failure', refreshError);
                }
            } finally {
                setGenderUpdatingCharacterIds(previous => removePendingValue(previous, characterId));
            }
        };

        void run();
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
