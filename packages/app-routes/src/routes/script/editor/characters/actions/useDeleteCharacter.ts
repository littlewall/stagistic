import {useCallback} from 'react';

import type {ScriptCharacterRecord} from '../types';
import type {
    CharacterActionSharedArgs, DeleteEditorCallbacks, SetStringArrayState,
} from './types';
import {
    addPendingValue,
    removePendingValue,
} from './utils';

interface UseDeleteCharacterArgs extends CharacterActionSharedArgs {
    confirmedCharactersById: ReadonlyMap<string, ScriptCharacterRecord>,
    setDeletingCharacterIds: SetStringArrayState,
}

export const useDeleteCharacter = ({
    currentScriptId,
    scriptRepository,
    setConfirmedCharacterRecords,
    confirmedCharactersById,
    setDeletingCharacterIds,
}: UseDeleteCharacterArgs) => {
    return useCallback((characterId: string, editorCallbacks?: DeleteEditorCallbacks) => {
        if (!currentScriptId || !characterId) {
            return;
        }

        if (!confirmedCharactersById.has(characterId)) {
            return;
        }

        setDeletingCharacterIds(previous => addPendingValue(previous, characterId));

        const run = async () => {
            try {
                await scriptRepository.deleteScriptCharacter(currentScriptId, characterId);
                setConfirmedCharacterRecords(previous => {
                    return previous.filter(character => character.id !== characterId);
                });

                editorCallbacks?.onUnlinkRef(characterId);
            } catch (error) {
                console.error('Failed to delete script character', error);
            } finally {
                setDeletingCharacterIds(previous => removePendingValue(previous, characterId));
            }
        };

        void run();
    }, [
        confirmedCharactersById,
        currentScriptId,
        scriptRepository,
        setConfirmedCharacterRecords,
        setDeletingCharacterIds,
    ]);
};
