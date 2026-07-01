import {
    useCallback,
    useMemo,
} from 'react';

import {useScriptEditorCharacters} from './editor/characters/useScriptEditorCharacters';
import type {UseScriptEditorCharactersArgs} from './editor/characters/useScriptEditorCharacters.types';
import type {ScriptCharactersContextValue} from './ScriptCharactersContext';

interface UseScriptCharactersContextValueResult {
    getEditorValue: ReturnType<typeof useScriptEditorCharacters>['getEditorValue'],
    editorOverrideValue: ScriptCharactersContextValue['editorOverrideValue'],
    normalizedConfirmedCharacterRecords: ScriptCharactersContextValue['normalizedConfirmedCharacterRecords'],
    handleResolvedEditorValueChange: ScriptCharactersContextValue['handleEditorValueChange'],
    contextValue: ScriptCharactersContextValue,
}

export const useScriptCharactersContextValue = (
    args: UseScriptEditorCharactersArgs,
): UseScriptCharactersContextValueResult => {
    const {
        getEditorValue,
        editorOverrideValue,
        confirmedCharacterRecords,
        normalizedConfirmedCharacterRecords,
        pendingCharacterKeys,
        deletingCharacterIds,
        renamingCharacterIds,
        renamingCharacterKeys,
        colorUpdatingCharacterIds,
        genderUpdatingCharacterIds,
        characterGenderOptions,
        isCharactersLoading,
        handleEditorValueChange,
        normalizeCharacterNameForInlineInput,
        handleConfirmCharacter,
        handleDeleteCharacter,
        handleRenameCharacterPreview,
        handleRenameCharacter,
        handleSetCharacterColor,
        handleSetCharacterGender,
        handleUpsertCharacterGender,
    } = useScriptEditorCharacters(args);

    const handleResolvedEditorValueChange = useCallback((
        value: Parameters<typeof handleEditorValueChange>[0],
        meta?: Parameters<typeof handleEditorValueChange>[1],
    ) => {
        handleEditorValueChange(value, meta);
    }, [handleEditorValueChange]);

    const contextValue: ScriptCharactersContextValue = useMemo(() => ({
        editorOverrideValue,
        normalizedConfirmedCharacterRecords,
        handleEditorValueChange,
        confirmedCharacterRecords,
        pendingCharacterKeys,
        deletingCharacterIds,
        renamingCharacterIds,
        renamingCharacterKeys,
        colorUpdatingCharacterIds,
        genderUpdatingCharacterIds,
        characterGenderOptions,
        isCharactersLoading,
        normalizeCharacterNameForInlineInput,
        handleConfirmCharacter,
        handleDeleteCharacter,
        handleRenameCharacterPreview,
        handleRenameCharacter,
        handleSetCharacterColor,
        handleSetCharacterGender,
        handleUpsertCharacterGender,
    }), [
        characterGenderOptions,
        colorUpdatingCharacterIds,
        confirmedCharacterRecords,
        deletingCharacterIds,
        editorOverrideValue,
        genderUpdatingCharacterIds,
        handleConfirmCharacter,
        handleDeleteCharacter,
        handleEditorValueChange,
        handleRenameCharacter,
        handleRenameCharacterPreview,
        handleSetCharacterColor,
        handleSetCharacterGender,
        handleUpsertCharacterGender,
        isCharactersLoading,
        normalizeCharacterNameForInlineInput,
        normalizedConfirmedCharacterRecords,
        pendingCharacterKeys,
        renamingCharacterIds,
        renamingCharacterKeys,
    ]);

    return {
        getEditorValue,
        editorOverrideValue,
        normalizedConfirmedCharacterRecords,
        handleResolvedEditorValueChange,
        contextValue,
    };
};
