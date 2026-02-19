import {useCallback} from 'react';

import type {ScriptCharacterRecord} from '../types';
import type {CharacterActionSharedArgs, SetStringArrayState} from './types';
import {
    addPendingValue,
    removePendingValue,
} from './utils';

interface UseSetCharacterColorArgs extends CharacterActionSharedArgs {
    confirmedCharactersById: ReadonlyMap<string, ScriptCharacterRecord>,
    setColorUpdatingCharacterIds: SetStringArrayState,
}

export const useSetCharacterColor = ({
    currentScriptId,
    scriptRepository,
    setConfirmedCharacterRecords,
    confirmedCharactersById,
    setColorUpdatingCharacterIds,
}: UseSetCharacterColorArgs) => {
    return useCallback((characterId: string, colorHex: string | null) => {
        if (!currentScriptId || !characterId) {
            return;
        }

        if (!confirmedCharactersById.has(characterId)) {
            return;
        }

        setConfirmedCharacterRecords(previous => previous.map(character => {
            if (character.id !== characterId) {
                return character;
            }

            return {
                ...character,
                colorHex,
            };
        }));
        setColorUpdatingCharacterIds(previous => addPendingValue(previous, characterId));

        const run = async () => {
            try {
                const updatedCharacter = await scriptRepository.setScriptCharacterColor(
                    currentScriptId,
                    characterId,
                    colorHex,
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
                console.error('Failed to set character color', error);

                try {
                    const storedCharacters = await scriptRepository.listScriptCharacters(currentScriptId);

                    setConfirmedCharacterRecords(storedCharacters);
                } catch (refreshError) {
                    console.error('Failed to refresh script characters after color update failure', refreshError);
                }
            } finally {
                setColorUpdatingCharacterIds(previous => removePendingValue(previous, characterId));
            }
        };

        void run();
    }, [
        confirmedCharactersById,
        currentScriptId,
        scriptRepository,
        setColorUpdatingCharacterIds,
        setConfirmedCharacterRecords,
    ]);
};
