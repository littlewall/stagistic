import {normalizeCharacterKey} from '@stagistic/script-core';
import {useCallback} from 'react';

import {
    normalizeCharacterDisplayName,
} from '../index';
import type {ScriptCharacterRecord} from '../types';
import type {
    CharacterActionSharedArgs,
    RenameEditorCallbacks,
    RenamePreviewEditorCallbacks,
    SetStringArrayState,
} from './types';
import {
    addPendingValue,
    removePendingValue,
} from './utils';

interface UseRenameCharacterArgs extends CharacterActionSharedArgs {
    confirmedCharactersById: ReadonlyMap<string, ScriptCharacterRecord>,
    setRenamingCharacterIds: SetStringArrayState,
    setRenamingCharacterKeys: SetStringArrayState,
}

const callOnRenameText = (
    callbacks: RenamePreviewEditorCallbacks | undefined,
    characterId: string,
    newName: string,
): void => {
    if (callbacks) {
        callbacks.onRenameText(characterId, newName);
    }
};

const callOnReplaceId = (
    callbacks: RenameEditorCallbacks | undefined,
    oldId: string,
    newId: string,
): void => {
    if (callbacks) {
        callbacks.onReplaceId(oldId, newId);
    }
};

export const useRenameCharacter = ({
    currentScriptId,
    scriptRepository,
    setConfirmedCharacterRecords,
    confirmedCharactersById,
    setRenamingCharacterIds,
    setRenamingCharacterKeys,
}: UseRenameCharacterArgs) => {
    const handleRenameCharacterPreview = useCallback((
        characterId: string,
        _previousCharacterName: string,
        nextCharacterName: string,
        editorCallbacks?: RenamePreviewEditorCallbacks,
    ) => {
        if (!currentScriptId || !characterId) {
            return;
        }

        const characterRecord = confirmedCharactersById.get(characterId);

        if (!characterRecord) {
            return;
        }

        const previousKey = normalizeCharacterKey(characterRecord.key);
        const normalizedNextName = normalizeCharacterDisplayName(nextCharacterName);

        if (!previousKey || normalizedNextName.length === 0) {
            return;
        }

        callOnRenameText(editorCallbacks, characterId, normalizedNextName);
    }, [confirmedCharactersById, currentScriptId]);

    const handleRenameCharacter = useCallback((
        characterId: string,
        _previousCharacterName: string,
        nextCharacterName: string,
        editorCallbacks?: RenameEditorCallbacks,
    ) => {
        if (!currentScriptId) {
            return;
        }

        const characterRecord = confirmedCharactersById.get(characterId);

        if (!characterRecord) {
            return;
        }

        const previousKey = normalizeCharacterKey(characterRecord.key);
        const normalizedNextName = normalizeCharacterDisplayName(nextCharacterName);
        const nextKey = normalizeCharacterKey(normalizedNextName);

        if (!previousKey || !nextKey) {
            return;
        }

        setRenamingCharacterIds(previous => addPendingValue(previous, characterId));
        setRenamingCharacterKeys(previous => {
            const next = new Set(previous);

            next.add(previousKey);
            next.add(nextKey);

            return Array.from(next);
        });

        const run = async () => {
            try {
                // Rename in the editor immediately for responsiveness
                callOnRenameText(editorCallbacks, characterId, normalizedNextName);

                // Update the database
                const renamedCharacter = await scriptRepository.renameScriptCharacter(
                    currentScriptId,
                    characterId,
                    nextKey,
                );

                if (!renamedCharacter) {
                    const storedCharacters = await scriptRepository.listScriptCharacters(currentScriptId);

                    setConfirmedCharacterRecords(storedCharacters);
                    // Revert editor text
                    callOnRenameText(editorCallbacks, characterId, characterRecord.key);

                    return;
                }

                setConfirmedCharacterRecords(previous => {
                    const next = previous
                        .filter(character => character.id !== characterId && character.id !== renamedCharacter.id);

                    next.push(renamedCharacter);

                    return next;
                });

                // If the character ID changed, update refs
                if (renamedCharacter.id !== characterId) {
                    callOnReplaceId(editorCallbacks, characterId, renamedCharacter.id);
                }
            } catch (error) {
                console.error('Failed to rename script character', error);

                try {
                    const storedCharacters = await scriptRepository.listScriptCharacters(currentScriptId);

                    setConfirmedCharacterRecords(storedCharacters);
                    // Revert editor text
                    callOnRenameText(editorCallbacks, characterId, characterRecord.key);
                } catch (refreshError) {
                    console.error('Failed to refresh script characters after rename failure', refreshError);
                }
            } finally {
                setRenamingCharacterIds(previous => removePendingValue(previous, characterId));
                setRenamingCharacterKeys(previous => previous
                    .filter(value => value !== previousKey && value !== nextKey));
            }
        };

        void run();
    }, [
        confirmedCharactersById,
        currentScriptId,
        scriptRepository,
        setConfirmedCharacterRecords,
        setRenamingCharacterIds,
        setRenamingCharacterKeys,
    ]);

    return {
        handleRenameCharacterPreview,
        handleRenameCharacter,
    };
};
