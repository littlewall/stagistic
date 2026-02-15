import {type useScriptRepository} from '@stagistic/app-core';
import {type EditorSettings} from '@stagistic/script-core';
import {
    type ScriptDocument,
} from '@stagistic/script-core';

import type {
    CharacterGenderOption,
    CharacterCountItem,
    ScriptCharacterRecord,
} from './types';

export type ScriptRepository = ReturnType<typeof useScriptRepository>;

export type UseScriptEditorCharactersArgs = {
    currentScriptId: string | null,
    scriptRepository: ScriptRepository,
    initialValue: ScriptDocument | null | undefined,
    resolvedScriptSettings: EditorSettings,
    characterColorSaturation: number,
    handleAutoSave: (value: ScriptDocument) => Promise<boolean>,
};

export type UseScriptEditorCharactersResult = {
    editorValue: ScriptDocument | null,
    editorOverrideValue: ScriptDocument | null,
    normalizedConfirmedCharacterRecords: ScriptCharacterRecord[],
    confirmedCharacters: CharacterCountItem[],
    unconfirmedCharacters: CharacterCountItem[],
    characterGenderOptions: CharacterGenderOption[],
    isCharactersLoading: boolean,
    handleEditorValueChange: (value: ScriptDocument) => void,
    normalizeCharacterNameForInlineInput: (name: string) => string,
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
