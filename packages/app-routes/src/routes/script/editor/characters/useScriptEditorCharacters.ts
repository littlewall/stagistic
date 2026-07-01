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
        confirmedCharactersById,
        confirmedCharacterSet,
        normalizeCharacterNameForInlineInput,
    } = useCharacterComputed({
        data: {
            confirmedCharacterRecords: characters.confirmedCharacterRecords,
            characterSnapshot: null,
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
        options: {
            includeSidebarLists: false,
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
            setters,
        },
        computed: {
            confirmedCharacterSet,
            confirmedCharactersById,
        },
    });

    return {
        getEditorValue: editor.getEditorValue,
        editorOverrideValue: editor.editorOverrideValue,
        confirmedCharacterRecords: characters.confirmedCharacterRecords,
        normalizedConfirmedCharacterRecords,
        pendingCharacterKeys: pending.confirmingCharacterKeys,
        deletingCharacterIds: pending.deletingCharacterIds,
        renamingCharacterIds: pending.renamingCharacterIds,
        renamingCharacterKeys: pending.renamingCharacterKeys,
        colorUpdatingCharacterIds: pending.colorUpdatingCharacterIds,
        genderUpdatingCharacterIds: pending.genderUpdatingCharacterIds,
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
