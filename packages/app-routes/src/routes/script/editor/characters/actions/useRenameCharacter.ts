import {normalizeCharacterKey} from '@stagistic/script-core';
import {useCallback} from 'react';

import {
    normalizeCharacterDisplayName,
    renameCharacterInScriptDocument,
    replaceCharacterRefIdInScriptDocument,
} from '../index';
import type {ScriptCharacterRecord} from '../types';
import type {CharacterActionSharedArgs, SetStringArrayState} from './types';
import {
    addPendingValue,
    getSourceDocument,
    removePendingValue,
} from './utils';

type UseRenameCharacterArgs = CharacterActionSharedArgs & {
    confirmedCharactersById: ReadonlyMap<string, ScriptCharacterRecord>,
    getCharacterNameForBlockType: (name: string, blockType: unknown) => string,
    setRenamingCharacterIds: SetStringArrayState,
    setRenamingCharacterKeys: SetStringArrayState,
};

type RenameCharacterActions = {
    handleRenameCharacterPreview: (
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
    ) => void,
    handleRenameCharacter: (
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
    ) => void,
};

export const useRenameCharacter = ({
    currentScriptId,
    scriptRepository,
    initialValue,
    editorValue,
    setEditorValue,
    setEditorOverrideValue,
    setConfirmedCharacterRecords,
    confirmedCharactersById,
    getCharacterNameForBlockType,
    setRenamingCharacterIds,
    setRenamingCharacterKeys,
    handleAutoSave,
}: UseRenameCharacterArgs): RenameCharacterActions => {
    const handleRenameCharacterPreview = useCallback((
        characterId: string,
        _previousCharacterName: string,
        nextCharacterName: string,
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

        const sourceDocument = getSourceDocument(editorValue, initialValue);

        if (!sourceDocument) {
            return;
        }

        const {
            value: nextDocument,
            changed: didChangeDocument,
        } = renameCharacterInScriptDocument(
            sourceDocument,
            previousKey,
            normalizedNextName,
            getCharacterNameForBlockType,
            {characterId},
        );

        if (!didChangeDocument) {
            return;
        }

        setEditorOverrideValue(nextDocument);
    }, [
        confirmedCharactersById,
        currentScriptId,
        editorValue,
        getCharacterNameForBlockType,
        initialValue,
        setEditorOverrideValue,
    ]);

    const handleRenameCharacter = useCallback((
        characterId: string,
        _previousCharacterName: string,
        nextCharacterName: string,
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

        const sourceDocument = getSourceDocument(editorValue, initialValue);

        if (!sourceDocument) {
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
                const {
                    value: renamedDocument,
                    changed: didChangeDocument,
                } = renameCharacterInScriptDocument(
                    sourceDocument,
                    previousKey,
                    normalizedNextName,
                    getCharacterNameForBlockType,
                    {characterId},
                );
                let documentToPersist = didChangeDocument
                    ? renamedDocument
                    : sourceDocument;

                if (didChangeDocument) {
                    const didSave = await handleAutoSave(renamedDocument);

                    if (!didSave) {
                        const storedCharacters = await scriptRepository.listScriptCharacters(currentScriptId);

                        setConfirmedCharacterRecords(storedCharacters);

                        return;
                    }

                    setEditorOverrideValue(renamedDocument);
                    setEditorValue(renamedDocument);
                }

                const renamedCharacter = await scriptRepository.renameScriptCharacter(
                    currentScriptId,
                    characterId,
                    nextKey,
                );

                if (!renamedCharacter) {
                    const storedCharacters = await scriptRepository.listScriptCharacters(currentScriptId);

                    setConfirmedCharacterRecords(storedCharacters);

                    return;
                }

                setConfirmedCharacterRecords(previous => {
                    const next = previous
                        .filter(character => character.id !== characterId && character.id !== renamedCharacter.id);

                    next.push(renamedCharacter);

                    return next;
                });

                if (renamedCharacter.id === characterId) {
                    return;
                }

                const {
                    value: relinkedDocument,
                    changed: didRelinkCharacterRef,
                } = replaceCharacterRefIdInScriptDocument(
                    documentToPersist,
                    characterId,
                    renamedCharacter.id,
                );

                if (didRelinkCharacterRef) {
                    documentToPersist = relinkedDocument;
                    setEditorOverrideValue(relinkedDocument);
                    setEditorValue(relinkedDocument);
                    await handleAutoSave(relinkedDocument);
                }
            } catch (error) {
                console.error('Failed to rename script character', error);

                try {
                    const storedCharacters = await scriptRepository.listScriptCharacters(currentScriptId);

                    setConfirmedCharacterRecords(storedCharacters);
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
        editorValue,
        getCharacterNameForBlockType,
        handleAutoSave,
        initialValue,
        scriptRepository,
        setConfirmedCharacterRecords,
        setEditorOverrideValue,
        setEditorValue,
        setRenamingCharacterIds,
        setRenamingCharacterKeys,
    ]);

    return {
        handleRenameCharacterPreview,
        handleRenameCharacter,
    };
};
