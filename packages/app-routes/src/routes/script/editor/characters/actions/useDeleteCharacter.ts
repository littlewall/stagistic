import {useCallback} from 'react';

import {unlinkCharacterRefInScriptDocument} from '../index';
import type {ScriptCharacterRecord} from '../types';
import type {CharacterActionSharedArgs, SetStringArrayState} from './types';
import {
    addPendingValue,
    getSourceDocument,
    removePendingValue,
} from './utils';

interface UseDeleteCharacterArgs extends CharacterActionSharedArgs {
    confirmedCharactersById: ReadonlyMap<string, ScriptCharacterRecord>,
    setDeletingCharacterIds: SetStringArrayState,
}

export const useDeleteCharacter = ({
    currentScriptId,
    scriptRepository,
    initialValue,
    editorValue,
    setEditorValue,
    setEditorOverrideValue,
    setConfirmedCharacterRecords,
    confirmedCharactersById,
    setDeletingCharacterIds,
    handleAutoSave,
}: UseDeleteCharacterArgs) => {
    return useCallback((characterId: string) => {
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

                const sourceDocument = getSourceDocument(editorValue, initialValue);

                if (sourceDocument) {
                    const {
                        value: unlinkedDocument,
                        changed: didUnlinkCharacterRef,
                    } = unlinkCharacterRefInScriptDocument(sourceDocument, characterId);

                    if (didUnlinkCharacterRef) {
                        setEditorOverrideValue(unlinkedDocument);
                        setEditorValue(unlinkedDocument);
                        await handleAutoSave(unlinkedDocument);
                    }
                }
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
        editorValue,
        handleAutoSave,
        initialValue,
        scriptRepository,
        setConfirmedCharacterRecords,
        setDeletingCharacterIds,
        setEditorOverrideValue,
        setEditorValue,
    ]);
};
