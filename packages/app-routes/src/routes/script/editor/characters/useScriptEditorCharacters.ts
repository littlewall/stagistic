import {useCharacterActions} from './useCharacterActions';
import {useCharacterComputed} from './useCharacterComputed';
import {useCharacterState} from './useCharacterState';
import type {
    UseScriptEditorCharactersArgs,
    UseScriptEditorCharactersResult,
} from './useScriptEditorCharacters.types';

export const useScriptEditorCharacters = ({
    currentScriptId,
    scriptRepository,
    initialValue,
    resolvedScriptSettings,
    characterColorSaturation,
    handleAutoSave,
}: UseScriptEditorCharactersArgs): UseScriptEditorCharactersResult => {
    const {
        editorValue,
        setEditorValue,
        editorOverrideValue,
        setEditorOverrideValue,
        confirmedCharacterRecords,
        setConfirmedCharacterRecords,
        confirmingCharacterKeys,
        setConfirmingCharacterKeys,
        deletingCharacterIds,
        setDeletingCharacterIds,
        renamingCharacterIds,
        setRenamingCharacterIds,
        renamingCharacterKeys,
        setRenamingCharacterKeys,
        colorUpdatingCharacterIds,
        setColorUpdatingCharacterIds,
        genderUpdatingCharacterIds,
        setGenderUpdatingCharacterIds,
        characterGenderOptions,
        setCharacterGenderOptions,
        isCharactersLoading,
        handleEditorValueChange,
    } = useCharacterState({
        currentScriptId,
        scriptRepository,
        initialValue,
    });

    const {
        normalizedConfirmedCharacterRecords,
        confirmedCharacters,
        unconfirmedCharacters,
        confirmedCharactersById,
        confirmedCharacterSet,
        getCharacterNameForBlockType,
        normalizeCharacterNameForInlineInput,
    } = useCharacterComputed({
        confirmedCharacterRecords,
        confirmingCharacterKeys,
        deletingCharacterIds,
        renamingCharacterIds,
        renamingCharacterKeys,
        colorUpdatingCharacterIds,
        genderUpdatingCharacterIds,
        editorValue,
        initialValue,
        resolvedScriptSettings,
        characterColorSaturation,
    });

    const {
        handleConfirmCharacter,
        handleDeleteCharacter,
        handleRenameCharacterPreview,
        handleRenameCharacter,
        handleSetCharacterColor,
        handleSetCharacterGender,
        handleUpsertCharacterGender,
    } = useCharacterActions({
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
        setColorUpdatingCharacterIds,
        setGenderUpdatingCharacterIds,
        setCharacterGenderOptions,
        confirmedCharacterSet,
        confirmedCharactersById,
        getCharacterNameForBlockType,
        handleAutoSave,
    });

    return {
        editorValue,
        editorOverrideValue,
        normalizedConfirmedCharacterRecords,
        confirmedCharacters,
        unconfirmedCharacters,
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
    };
};
