import {normalizeCharacterKey} from '@stagistic/editor-core';
import {type ScriptDocument} from '@stagistic/shared';
import {
    type Dispatch,
    type SetStateAction,
    useCallback,
} from 'react';

import {
    linkCharacterRefInScriptDocument,
    normalizeCharacterDisplayName,
    renameCharacterInScriptDocument,
    replaceCharacterRefIdInScriptDocument,
    unlinkCharacterRefInScriptDocument,
} from './index';
import type {ScriptCharacterRecord} from './types';
import type {ScriptRepository} from './useScriptEditorCharacters.types';

type UseCharacterActionsArgs = {
    currentScriptId: string | null,
    scriptRepository: ScriptRepository,
    initialValue: ScriptDocument | null | undefined,
    editorValue: ScriptDocument | null,
    setEditorValue: Dispatch<SetStateAction<ScriptDocument | null>>,
    setEditorOverrideValue: Dispatch<SetStateAction<ScriptDocument | null>>,
    setConfirmedCharacterRecords: Dispatch<SetStateAction<ScriptCharacterRecord[]>>,
    setConfirmingCharacterKeys: Dispatch<SetStateAction<string[]>>,
    setDeletingCharacterIds: Dispatch<SetStateAction<string[]>>,
    setRenamingCharacterIds: Dispatch<SetStateAction<string[]>>,
    setRenamingCharacterKeys: Dispatch<SetStateAction<string[]>>,
    confirmedCharacterSet: ReadonlySet<string>,
    confirmedCharactersById: ReadonlyMap<string, ScriptCharacterRecord>,
    getCharacterNameForBlockType: (name: string, blockType: unknown) => string,
    handleAutoSave: (value: ScriptDocument) => Promise<boolean>,
};

export type CharacterActions = {
    handleConfirmCharacter: (characterKey: string) => void,
    handleDeleteCharacter: (characterId: string) => void,
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

export const useCharacterActions = ({
    currentScriptId,
    scriptRepository,
    initialValue,
    editorValue,
    setEditorValue,
    setEditorOverrideValue,
    setConfirmedCharacterRecords,
    setConfirmingCharacterKeys,
    setDeletingCharacterIds,
    setRenamingCharacterIds,
    setRenamingCharacterKeys,
    confirmedCharacterSet,
    confirmedCharactersById,
    getCharacterNameForBlockType,
    handleAutoSave,
}: UseCharacterActionsArgs): CharacterActions => {
    const handleConfirmCharacter = useCallback((characterKey: string) => {
        if (!currentScriptId) {
            return;
        }

        const normalizedKey = normalizeCharacterKey(characterKey);

        if (!normalizedKey || confirmedCharacterSet.has(normalizedKey)) {
            return;
        }

        setConfirmingCharacterKeys(previous => {
            if (previous.includes(normalizedKey)) {
                return previous;
            }

            return [...previous, normalizedKey];
        });

        const run = async () => {
            try {
                const confirmedCharacter = await scriptRepository.confirmScriptCharacter(currentScriptId, normalizedKey);

                if (!confirmedCharacter) {
                    return;
                }

                setConfirmedCharacterRecords(previous => {
                    const next = previous
                        .filter(character => character.id !== confirmedCharacter.id && character.key !== confirmedCharacter.key);

                    next.push(confirmedCharacter);

                    return next;
                });

                const sourceDocument = editorValue ?? initialValue;

                if (sourceDocument) {
                    const {
                        value: linkedDocument,
                        changed: didLinkCharacterRef,
                    } = linkCharacterRefInScriptDocument(
                        sourceDocument,
                        normalizedKey,
                        confirmedCharacter.id,
                    );

                    if (didLinkCharacterRef) {
                        setEditorOverrideValue(linkedDocument);
                        setEditorValue(linkedDocument);
                        await handleAutoSave(linkedDocument);
                    }
                }
            } catch (error) {
                console.error('Failed to confirm script character', error);
            } finally {
                setConfirmingCharacterKeys(previous => previous.filter(value => value !== normalizedKey));
            }
        };

        void run();
    }, [
        confirmedCharacterSet,
        currentScriptId,
        editorValue,
        handleAutoSave,
        initialValue,
        scriptRepository,
        setConfirmedCharacterRecords,
        setConfirmingCharacterKeys,
        setEditorOverrideValue,
        setEditorValue,
    ]);

    const handleRenameCharacterPreview = useCallback((
        characterId: string,
        _previousCharacterName: string,
        nextCharacterName: string,
    ) => {
        if (!currentScriptId) {
            return;
        }

        if (!characterId) {
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

        const sourceDocument = editorValue ?? initialValue;

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

    const handleDeleteCharacter = useCallback((characterId: string) => {
        if (!currentScriptId) {
            return;
        }

        if (!characterId) {
            return;
        }

        if (!confirmedCharactersById.has(characterId)) {
            return;
        }

        setDeletingCharacterIds(previous => {
            if (previous.includes(characterId)) {
                return previous;
            }

            return [...previous, characterId];
        });

        const run = async () => {
            try {
                await scriptRepository.deleteScriptCharacter(currentScriptId, characterId);
                setConfirmedCharacterRecords(previous => {
                    return previous.filter(character => character.id !== characterId);
                });

                const sourceDocument = editorValue ?? initialValue;

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
                setDeletingCharacterIds(previous => previous.filter(value => value !== characterId));
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

        const sourceDocument = editorValue ?? initialValue;

        if (!sourceDocument) {
            return;
        }

        setRenamingCharacterIds(previous => {
            if (previous.includes(characterId)) {
                return previous;
            }

            return [...previous, characterId];
        });
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

                if (renamedCharacter) {
                    setConfirmedCharacterRecords(previous => {
                        const next = previous
                            .filter(character => character.id !== characterId && character.id !== renamedCharacter.id);

                        next.push(renamedCharacter);

                        return next;
                    });

                    if (renamedCharacter.id !== characterId) {
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
                    }
                } else {
                    const storedCharacters = await scriptRepository.listScriptCharacters(currentScriptId);

                    setConfirmedCharacterRecords(storedCharacters);
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
                setRenamingCharacterIds(previous => previous.filter(value => value !== characterId));
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
        handleConfirmCharacter,
        handleDeleteCharacter,
        handleRenameCharacterPreview,
        handleRenameCharacter,
    };
};
