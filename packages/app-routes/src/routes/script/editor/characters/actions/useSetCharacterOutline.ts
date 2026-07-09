import {useCallback} from 'react';

import type {ScriptCharacterRecord} from '../types';
import type {CharacterActionSharedArgs} from './types';

interface UseSetCharacterOutlineArgs extends CharacterActionSharedArgs {
    confirmedCharactersById: ReadonlyMap<string, ScriptCharacterRecord>,
}

export const useSetCharacterOutline = ({
    currentScriptId,
    scriptRepository,
    setConfirmedCharacterRecords,
    confirmedCharactersById,
}: UseSetCharacterOutlineArgs) => {
    return useCallback((characterId: string, outline: string | null) => {
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
                outline,
            };
        }));

        /*
         * Fire-and-forget: the optimistic value above is the source of truth while
         * the user keeps typing, so we don't overwrite it with the DB return on
         * success (which would race successive saves). We only refresh on failure.
         */
        void (async () => {
            const refreshFromStore = async () => {
                const storedCharacters = await scriptRepository.listScriptCharacters(currentScriptId);

                setConfirmedCharacterRecords(storedCharacters);
            };

            try {
                const updatedCharacter = await scriptRepository.setScriptCharacterOutline(
                    currentScriptId,
                    characterId,
                    outline,
                );

                if (!updatedCharacter) {
                    await refreshFromStore();
                }
            } catch (error) {
                console.error('Failed to set character outline', error);

                try {
                    await refreshFromStore();
                } catch (refreshError) {
                    console.error('Failed to refresh characters after outline update', refreshError);
                }
            }
        })();
    }, [
        confirmedCharactersById,
        currentScriptId,
        scriptRepository,
        setConfirmedCharacterRecords,
    ]);
};
