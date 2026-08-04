import {type useScriptCharacterCatalog} from '@stagistic/app-core';
import {
    type EditorValueChangeMeta,
} from '@stagistic/editor';
import {type EditorSettings} from '@stagistic/script';
import {
    type ScriptDocument,
} from '@stagistic/script';

import type {
    CharacterGenderOption,
    ScriptCharacterGroupRecord,
    ScriptCharacterRecord,
} from './types';

export interface UseScriptEditorCharactersArgs {
    currentScriptId: string | null,
    characterCatalog: ReturnType<typeof useScriptCharacterCatalog>,
    initialValue: ScriptDocument | null | undefined,
    resolvedScriptSettings: EditorSettings,
    characterColorSaturation: number,
    handleAutoSave: (value: ScriptDocument) => Promise<boolean>,
}

export interface UseScriptEditorCharactersResult {
    applyDocumentChange: (change: {
        value: ScriptDocument,
        changed: boolean,
    }) => Promise<boolean>,
    getEditorValue: () => ScriptDocument | null,
    editorOverrideValue: ScriptDocument | null,
    confirmedCharacterRecords: ScriptCharacterRecord[],
    confirmedGroupRecords: ScriptCharacterGroupRecord[],
    normalizedConfirmedCharacterRecords: ScriptCharacterRecord[],
    normalizedSpeakingEntityRecords: ScriptCharacterRecord[],
    pendingCharacterKeys: string[],
    deletingCharacterIds: string[],
    renamingCharacterIds: string[],
    renamingCharacterKeys: string[],
    colorUpdatingCharacterIds: string[],
    genderUpdatingCharacterIds: string[],
    creatingGroupKeys: string[],
    deletingGroupIds: string[],
    renamingGroupIds: string[],
    colorUpdatingGroupIds: string[],
    membershipUpdatingGroupIds: string[],
    characterGenderOptions: CharacterGenderOption[],
    isCharactersLoading: boolean,
    handleEditorValueChange: (value: ScriptDocument, meta?: EditorValueChangeMeta) => void,
    normalizeCharacterNameForInlineInput: (name: string) => string,
    handleConfirmCharacter: (characterKey: string, colorHex?: string | null) => void,
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
    ) => Promise<void>,
    handleSetCharacterColor: (characterId: string, colorHex: string | null) => void,
    handleSetCharacterGender: (characterId: string, genderKey: string | null) => void,
    handleSetCharacterOutline: (characterId: string, outline: string | null) => void,
    handleUpsertCharacterGender: (label: string) => Promise<CharacterGenderOption | null>,
    handleCreateGroup: (groupKey: string) => Promise<ScriptCharacterGroupRecord | null>,
    handleDeleteGroup: (groupId: string) => Promise<void>,
    handleRenameGroup: (
        groupId: string,
        previousGroupName: string,
        nextGroupName: string,
    ) => Promise<ScriptCharacterGroupRecord | null>,
    handleSetGroupColor: (groupId: string, colorHex: string | null) => Promise<void>,
    handleReplaceGroupMembers: (groupId: string, memberIds: string[]) => Promise<void>,
}
