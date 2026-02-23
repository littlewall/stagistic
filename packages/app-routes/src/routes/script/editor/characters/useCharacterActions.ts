import {
    useConfirmCharacter,
    useDeleteCharacter,
    useRenameCharacter,
    useSetCharacterColor,
    useSetCharacterGender,
} from './actions';
import type {
    CharacterActionContext, ConfirmEditorCallbacks, DeleteEditorCallbacks, RenameEditorCallbacks, RenamePreviewEditorCallbacks,
} from './actions/types';
import type {
    CharacterGenderOption,
    ScriptCharacterRecord,
} from './types';

interface UseCharacterActionsArgs {
    context: CharacterActionContext,
    computed: {
        confirmedCharacterSet: ReadonlySet<string>,
        confirmedCharactersById: ReadonlyMap<string, ScriptCharacterRecord>,
    },
}

export interface CharacterActions {
    handleConfirmCharacter: (characterKey: string, editorCallbacks?: ConfirmEditorCallbacks) => void,
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
    ) => void,
    handleSetCharacterColor: (characterId: string, colorHex: string | null) => void,
    handleSetCharacterGender: (characterId: string, genderKey: string | null) => void,
    handleUpsertCharacterGender: (label: string) => Promise<CharacterGenderOption | null>,
}

export const useCharacterActions = ({
    context,
    computed,
}: UseCharacterActionsArgs): CharacterActions => {
    const {
        currentScriptId,
        scriptRepository,
        setters,
    } = context;
    const {
        confirmedCharacterSet,
        confirmedCharactersById,
    } = computed;

    const baseArgs = {
        currentScriptId,
        scriptRepository,
        setConfirmedCharacterRecords: setters.setConfirmedCharacterRecords,
    };

    const handleConfirmCharacter = useConfirmCharacter({
        ...baseArgs,
        confirmedCharacterSet,
        setConfirmingCharacterKeys: setters.setConfirmingCharacterKeys,
    });
    const handleDeleteCharacter = useDeleteCharacter({
        ...baseArgs,
        confirmedCharactersById,
        setDeletingCharacterIds: setters.setDeletingCharacterIds,
    });
    const {
        handleRenameCharacterPreview,
        handleRenameCharacter,
    } = useRenameCharacter({
        ...baseArgs,
        confirmedCharactersById,
        setRenamingCharacterIds: setters.setRenamingCharacterIds,
        setRenamingCharacterKeys: setters.setRenamingCharacterKeys,
    });
    const handleSetCharacterColor = useSetCharacterColor({
        ...baseArgs,
        confirmedCharactersById,
        setColorUpdatingCharacterIds: setters.setColorUpdatingCharacterIds,
    });
    const {
        handleSetCharacterGender,
        handleUpsertCharacterGender,
    } = useSetCharacterGender({
        ...baseArgs,
        confirmedCharactersById,
        setGenderUpdatingCharacterIds: setters.setGenderUpdatingCharacterIds,
        setCharacterGenderOptions: setters.setCharacterGenderOptions,
    });

    return {
        handleConfirmCharacter,
        handleDeleteCharacter,
        handleRenameCharacterPreview,
        handleRenameCharacter,
        handleSetCharacterColor,
        handleSetCharacterGender,
        handleUpsertCharacterGender,
    };
};
