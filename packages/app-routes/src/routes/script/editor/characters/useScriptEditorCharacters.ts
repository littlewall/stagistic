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
        editor,
        characters,
        pending,
        setters,
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
        data: {
            confirmedCharacterRecords: characters.confirmedCharacterRecords,
            editorValue: editor.sidebarValue,
            initialValue,
            resolvedScriptSettings,
            characterColorSaturation,
        },
        pending: {
            confirmingCharacterKeys: pending.confirmingCharacterKeys,
            deletingCharacterIds: pending.deletingCharacterIds,
            renamingCharacterIds: pending.renamingCharacterIds,
            renamingCharacterKeys: pending.renamingCharacterKeys,
            colorUpdatingCharacterIds: pending.colorUpdatingCharacterIds,
            genderUpdatingCharacterIds: pending.genderUpdatingCharacterIds,
        },
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
        context: {
            currentScriptId,
            scriptRepository,
            initialValue,
            editorValue: editor.editorValue,
            setEditorValue: editor.setEditorValue,
            setEditorOverrideValue: editor.setEditorOverrideValue,
            setters,
            handleAutoSave,
        },
        computed: {
            confirmedCharacterSet,
            confirmedCharactersById,
            getCharacterNameForBlockType,
        },
    });

    return {
        editorValue: editor.editorValue,
        sidebarValue: editor.sidebarValue,
        editorOverrideValue: editor.editorOverrideValue,
        normalizedConfirmedCharacterRecords,
        confirmedCharacters,
        unconfirmedCharacters,
        characterGenderOptions: characters.characterGenderOptions,
        isCharactersLoading: characters.isCharactersLoading,
        handleEditorValueChange: editor.handleEditorValueChange,
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
