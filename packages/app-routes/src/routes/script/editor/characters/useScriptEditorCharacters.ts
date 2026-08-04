import {useCharacterActions} from './useCharacterActions';
import {useCharacterComputed} from './useCharacterComputed';
import {useCharacterDocumentActions} from './useCharacterDocumentActions';
import {useCharacterGroupActions} from './useCharacterGroupActions';
import {useCharacterState} from './useCharacterState';
import type {
    UseScriptEditorCharactersArgs,
    UseScriptEditorCharactersResult,
} from './useScriptEditorCharacters.types';

export const useScriptEditorCharacters = ({
    currentScriptId,
    characterCatalog,
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
        characterCatalog,
        initialValue,
    });

    const {
        normalizedConfirmedCharacterRecords,
        normalizedSpeakingEntityRecords,
        confirmedCharactersById,
        confirmedGroupsById,
        confirmedCharacterSet,
        confirmedSpeakingEntitySet,
        normalizeCharacterNameForInlineInput,
        getCharacterNameForBlockType,
    } = useCharacterComputed({
        data: {
            confirmedCharacterRecords: catalog.characters,
            confirmedGroupRecords: catalog.groups,
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
    const {
        handleCreateGroup,
        handleDeleteGroup,
        handleRenameGroup,
        handleSetGroupColor,
        handleReplaceGroupMembers,
    } = useCharacterGroupActions({
        catalog,
        documentActions,
        confirmedSpeakingEntitySet,
        confirmedGroupsById,
    });

    return {
        applyDocumentChange: documentActions.applyDocumentChange,
        getEditorValue: editor.getEditorValue,
        editorOverrideValue: editor.editorOverrideValue,
        confirmedCharacterRecords: catalog.characters,
        confirmedGroupRecords: catalog.groups,
        normalizedConfirmedCharacterRecords,
        normalizedSpeakingEntityRecords,
        pendingCharacterKeys: catalog.pendingCharacterKeys,
        deletingCharacterIds: catalog.deletingCharacterIds,
        renamingCharacterIds: catalog.renamingCharacterIds,
        renamingCharacterKeys: catalog.renamingCharacterKeys,
        colorUpdatingCharacterIds: catalog.colorUpdatingCharacterIds,
        genderUpdatingCharacterIds: catalog.genderUpdatingCharacterIds,
        creatingGroupKeys: catalog.creatingGroupKeys,
        deletingGroupIds: catalog.deletingGroupIds,
        renamingGroupIds: catalog.renamingGroupIds,
        colorUpdatingGroupIds: catalog.colorUpdatingGroupIds,
        membershipUpdatingGroupIds: catalog.membershipUpdatingGroupIds,
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
        handleCreateGroup,
        handleDeleteGroup,
        handleRenameGroup,
        handleSetGroupColor,
        handleReplaceGroupMembers,
    };
};
