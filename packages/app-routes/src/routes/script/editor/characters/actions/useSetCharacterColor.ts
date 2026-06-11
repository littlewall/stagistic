import {useCallback} from 'react';

import type {ScriptCharacterRecord} from '../types';
import type {CharacterActionSharedArgs, SetStringArrayState} from './types';
import {runCharacterFieldUpdate} from './utils';

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

        void runCharacterFieldUpdate({
            characterId,
            currentScriptId,
            scriptRepository,
            setConfirmedCharacterRecords,
            setPendingIds: setColorUpdatingCharacterIds,
            apiCall: () => scriptRepository.setScriptCharacterColor(currentScriptId, characterId, colorHex),
            errorLabel: 'Failed to set character color',
        });
    }, [
        confirmedCharactersById,
        currentScriptId,
        scriptRepository,
        setColorUpdatingCharacterIds,
        setConfirmedCharacterRecords,
    ]);
};
