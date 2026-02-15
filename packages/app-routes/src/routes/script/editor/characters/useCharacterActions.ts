import {type ScriptDocument} from '@stagistic/script-core';
import {
    type Dispatch,
    type SetStateAction,
} from 'react';

import {
    useConfirmCharacter,
    useDeleteCharacter,
    useRenameCharacter,
    useSetCharacterColor,
    useSetCharacterGender,
} from './actions';
import type {
    CharacterGenderOption,
    ScriptCharacterRecord,
} from './types';
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
    setColorUpdatingCharacterIds: Dispatch<SetStateAction<string[]>>,
    setGenderUpdatingCharacterIds: Dispatch<SetStateAction<string[]>>,
    setCharacterGenderOptions: Dispatch<SetStateAction<CharacterGenderOption[]>>,
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
    handleSetCharacterColor: (characterId: string, colorHex: string | null) => void,
    handleSetCharacterGender: (characterId: string, genderKey: string | null) => void,
    handleUpsertCharacterGender: (label: string) => Promise<CharacterGenderOption | null>,
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
    setColorUpdatingCharacterIds,
    setGenderUpdatingCharacterIds,
    setCharacterGenderOptions,
    confirmedCharacterSet,
    confirmedCharactersById,
    getCharacterNameForBlockType,
    handleAutoSave,
}: UseCharacterActionsArgs): CharacterActions => {
    const baseArgs = {
        currentScriptId,
        scriptRepository,
        initialValue,
        editorValue,
        setEditorValue,
        setEditorOverrideValue,
        setConfirmedCharacterRecords,
        handleAutoSave,
    };

    const handleConfirmCharacter = useConfirmCharacter({
        ...baseArgs,
        confirmedCharacterSet,
        setConfirmingCharacterKeys,
    });
    const handleDeleteCharacter = useDeleteCharacter({
        ...baseArgs,
        confirmedCharactersById,
        setDeletingCharacterIds,
    });
    const {
        handleRenameCharacterPreview,
        handleRenameCharacter,
    } = useRenameCharacter({
        ...baseArgs,
        confirmedCharactersById,
        getCharacterNameForBlockType,
        setRenamingCharacterIds,
        setRenamingCharacterKeys,
    });
    const handleSetCharacterColor = useSetCharacterColor({
        ...baseArgs,
        confirmedCharactersById,
        setColorUpdatingCharacterIds,
    });
    const {
        handleSetCharacterGender,
        handleUpsertCharacterGender,
    } = useSetCharacterGender({
        ...baseArgs,
        confirmedCharactersById,
        setGenderUpdatingCharacterIds,
        setCharacterGenderOptions,
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
