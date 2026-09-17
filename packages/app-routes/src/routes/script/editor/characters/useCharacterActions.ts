import type {useScriptCharacterCatalog} from '@stagistic/app-core';
import {
    normalizeCharacterColorHex,
    normalizeCharacterKey,
} from '@stagistic/script';
import {useCallback} from 'react';

import type {
    ConfirmEditorCallbacks,
    DeleteEditorCallbacks,
    RenameEditorCallbacks,
    RenamePreviewEditorCallbacks,
} from './actions/types';
import {normalizeCharacterDisplayName} from './index';
import type {
    CharacterGenderOption,
    ScriptCharacterRecord,
} from './types';
import type {useCharacterDocumentActions} from './useCharacterDocumentActions';

type CharacterCatalog = ReturnType<typeof useScriptCharacterCatalog>;
type CharacterDocumentActions = ReturnType<typeof useCharacterDocumentActions>;

interface UseCharacterActionsArgs {
    catalog: CharacterCatalog,
    documentActions: CharacterDocumentActions,
    confirmedCharacterSet: ReadonlySet<string>,
    confirmedCharactersById: ReadonlyMap<string, ScriptCharacterRecord>,
}

export interface CharacterActions {
    handleConfirmCharacter: (characterKey: string, colorHex?: string | null, editorCallbacks?: ConfirmEditorCallbacks) => void,
    handleDeleteCharacter: (characterId: string, editorCallbacks?: DeleteEditorCallbacks) => void,
    handleRenameCharacterPreview: (
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
        editorCallbacks?: RenamePreviewEditorCallbacks,
    ) => void,
    handleRenameCharacter: (
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
        editorCallbacks?: RenameEditorCallbacks,
    ) => Promise<void>,
    handleSetCharacterColor: (characterId: string, colorHex: string | null) => void,
    handleSetCharacterGender: (characterId: string, genderKey: string | null) => void,
    handleSetCharacterOutline: (characterId: string, outline: string | null) => void,
    handleSetCharacterVoiceType: (characterId: string, voiceType: string | null) => void,
    handleSetCharacterVocalRange: (characterId: string, vocalRangeLow: string | null, vocalRangeHigh: string | null) => void,
    handleUpsertCharacterGender: (label: string) => Promise<CharacterGenderOption | null>,
}

export const useCharacterActions = ({
    catalog,
    documentActions,
    confirmedCharacterSet,
    confirmedCharactersById,
}: UseCharacterActionsArgs): CharacterActions => {
    const handleConfirmCharacter = useCallback((
        characterKey: string,
        colorHex?: string | null,
        editorCallbacks?: ConfirmEditorCallbacks,
    ) => {
        const normalizedKey = normalizeCharacterKey(characterKey);

        if (!normalizedKey || confirmedCharacterSet.has(normalizedKey)) {
            return;
        }

        void catalog.confirmCharacter(
            normalizedKey,
            normalizeCharacterColorHex(colorHex),
        ).then(async character => {
            if (!character) {
                return;
            }

            if (editorCallbacks) {
                editorCallbacks.onLinkRef(normalizedKey, character.id);

                return;
            }

            await documentActions.linkCharacter(normalizedKey, character.id);
        }).catch(() => undefined);
    }, [
        catalog,
        confirmedCharacterSet,
        documentActions,
    ]);

    const handleDeleteCharacter = useCallback((
        characterId: string,
        editorCallbacks?: DeleteEditorCallbacks,
    ) => {
        if (!confirmedCharactersById.has(characterId)) {
            return;
        }

        void catalog.deleteCharacter(characterId).then(async () => {
            if (editorCallbacks) {
                editorCallbacks.onUnlinkRef(characterId);

                return;
            }

            await documentActions.unlinkCharacter(characterId);
        }).catch(() => undefined);
    }, [
        catalog,
        confirmedCharactersById,
        documentActions,
    ]);

    const handleRenameCharacterPreview = useCallback((
        characterId: string,
        _previousCharacterName: string,
        nextCharacterName: string,
        editorCallbacks?: RenamePreviewEditorCallbacks,
    ) => {
        if (!confirmedCharactersById.has(characterId)) {
            return;
        }

        const nextName = normalizeCharacterDisplayName(nextCharacterName);

        if (nextName) {
            editorCallbacks?.onRenameText(characterId, nextName);
        }
    }, [confirmedCharactersById]);

    const handleRenameCharacter = useCallback((
        characterId: string,
        _previousCharacterName: string,
        nextCharacterName: string,
        editorCallbacks?: RenameEditorCallbacks,
    ) => {
        const original = confirmedCharactersById.get(characterId);
        const nextName = normalizeCharacterDisplayName(nextCharacterName);
        const nextKey = normalizeCharacterKey(nextName);

        if (!original || !nextKey) {
            return Promise.resolve();
        }

        editorCallbacks?.onRenameText(characterId, nextName);

        return catalog.renameCharacter(characterId, nextKey).then(async renamed => {
            if (!renamed) {
                return;
            }

            if (editorCallbacks) {
                if (renamed.id !== characterId) {
                    editorCallbacks.onReplaceId(characterId, renamed.id);
                }

                return;
            }

            await documentActions.renameCharacter(
                characterId,
                original.key,
                nextName,
                renamed.id,
            );
        }).catch(error => {
            editorCallbacks?.onRenameText(characterId, original.key);
            throw error;
        });
    }, [
        catalog,
        confirmedCharactersById,
        documentActions,
    ]);

    const handleSetCharacterColor = useCallback((id: string, color: string | null) => {
        return catalog.setCharacterColor(id, color).then(() => undefined);
    }, [catalog]);
    const handleSetCharacterGender = useCallback((id: string, gender: string | null) => {
        void catalog.setCharacterGender(id, gender).catch(() => undefined);
    }, [catalog]);
    const handleSetCharacterOutline = useCallback((id: string, outline: string | null) => {
        void catalog.setCharacterOutline(id, outline).catch(() => undefined);
    }, [catalog]);
    const handleSetCharacterVoiceType = useCallback((id: string, voiceType: string | null) => {
        void catalog.setCharacterVoiceType(id, voiceType).catch(() => undefined);
    }, [catalog]);
    const handleSetCharacterVocalRange = useCallback((id: string, low: string | null, high: string | null) => {
        void catalog.setCharacterVocalRange(id, low, high).catch(() => undefined);
    }, [catalog]);
    const handleUpsertCharacterGender = useCallback((label: string) => {
        return catalog.createGender(label).catch(() => null);
    }, [catalog]);

    return {
        handleConfirmCharacter,
        handleDeleteCharacter,
        handleRenameCharacterPreview,
        handleRenameCharacter,
        handleSetCharacterColor,
        handleSetCharacterGender,
        handleSetCharacterOutline,
        handleSetCharacterVoiceType,
        handleSetCharacterVocalRange,
        handleUpsertCharacterGender,
    };
};
