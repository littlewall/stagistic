import {useCharacterActions} from './useCharacterActions';
import {useCharacterComputed} from './useCharacterComputed';
import {useCharacterDocumentActions} from './useCharacterDocumentActions';
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
        catalog,
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
        getCharacterNameForBlockType,
    } = useCharacterComputed({
        data: {
            confirmedCharacterRecords: catalog.characters,
            characterSnapshot: null,
            resolvedScriptSettings,
            characterColorSaturation,
        },
        pending: {
            confirmingCharacterKeys: catalog.pendingCharacterKeys,
            deletingCharacterIds: catalog.deletingCharacterIds,
            renamingCharacterIds: catalog.renamingCharacterIds,
            renamingCharacterKeys: catalog.renamingCharacterKeys,
            colorUpdatingCharacterIds: catalog.colorUpdatingCharacterIds,
            genderUpdatingCharacterIds: catalog.genderUpdatingCharacterIds,
        },
        options: {
            includeSidebarLists: false,
        },
    });
    const documentActions = useCharacterDocumentActions({
        getEditorValue: editor.getEditorValue,
        setEditorValue: editor.setEditorValue,
        setEditorOverrideValue: editor.setEditorOverrideValue,
        handleAutoSave,
        getCharacterNameForBlockType,
    });

    const {
        handleConfirmCharacter,
        handleDeleteCharacter,
        handleRenameCharacterPreview,
        handleRenameCharacter,
        handleSetCharacterColor,
        handleSetCharacterGender,
        handleSetCharacterOutline,
        handleUpsertCharacterGender,
    } = useCharacterActions({
        catalog,
        documentActions,
        confirmedCharacterSet,
        confirmedCharactersById,
    });

    return {
        getEditorValue: editor.getEditorValue,
        editorOverrideValue: editor.editorOverrideValue,
        confirmedCharacterRecords: catalog.characters,
        normalizedConfirmedCharacterRecords,
        pendingCharacterKeys: catalog.pendingCharacterKeys,
        deletingCharacterIds: catalog.deletingCharacterIds,
        renamingCharacterIds: catalog.renamingCharacterIds,
        renamingCharacterKeys: catalog.renamingCharacterKeys,
        colorUpdatingCharacterIds: catalog.colorUpdatingCharacterIds,
        genderUpdatingCharacterIds: catalog.genderUpdatingCharacterIds,
        characterGenderOptions: catalog.genderOptions,
        isCharactersLoading: catalog.isLoading,
        handleEditorValueChange: editor.handleEditorValueChange,
        normalizeCharacterNameForInlineInput,
        handleConfirmCharacter,
        handleDeleteCharacter,
        handleRenameCharacterPreview,
        handleRenameCharacter,
        handleSetCharacterColor,
        handleSetCharacterGender,
        handleSetCharacterOutline,
        handleUpsertCharacterGender,
    };
};
