import {type EditorValueChangeMeta} from '@stagistic/editor';
import {type ScriptDocument} from '@stagistic/script';
import {
    createContext, type ReactNode, useContext,
} from 'react';

import type {
    ConfirmEditorCallbacks,
    DeleteEditorCallbacks,
    RenameEditorCallbacks,
    RenamePreviewEditorCallbacks,
} from './editor/characters/actions/types';
import type {
    CharacterGenderOption,
    ScriptCharacterGroupRecord,
    ScriptCharacterRecord,
} from './editor/characters/types';

export interface ScriptCharactersContextValue {
    // Consumed by ScriptEditor (via route)
    getEditorValue: () => ScriptDocument | null,
    editorOverrideValue: ScriptDocument | null,
    normalizedConfirmedCharacterRecords: ScriptCharacterRecord[],
    normalizedSpeakingEntityRecords: ScriptCharacterRecord[],
    handleEditorValueChange: (value: ScriptDocument, meta?: EditorValueChangeMeta) => void,

    // Sidebar display data
    confirmedCharacterRecords: ScriptCharacterRecord[],
    confirmedGroupRecords: ScriptCharacterGroupRecord[],
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

    // Sidebar actions (optional editorCallbacks — sidebar adds them using useEditorInstance)
    normalizeCharacterNameForInlineInput: (name: string) => string,
    handleConfirmCharacter: (characterKey: string, colorHex?: string | null, editorCallbacks?: ConfirmEditorCallbacks) => void,
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
    ) => Promise<void>,
    handleSetCharacterColor: (characterId: string, colorHex: string | null) => void,
    handleSetCharacterGender: (characterId: string, genderKey: string | null) => void,
    handleSetCharacterOutline: (characterId: string, outline: string | null) => void,
    handleUpsertCharacterGender: (label: string) => Promise<CharacterGenderOption | null>,
    handleCreateGroup: (
        groupKey: string,
        editorCallbacks?: ConfirmEditorCallbacks,
    ) => Promise<ScriptCharacterGroupRecord | null>,
    handleDeleteGroup: (
        groupId: string,
        editorCallbacks?: DeleteEditorCallbacks,
    ) => Promise<void>,
    handleRenameGroup: (
        groupId: string,
        previousGroupName: string,
        nextGroupName: string,
        editorCallbacks?: RenameEditorCallbacks,
    ) => Promise<ScriptCharacterGroupRecord | null>,
    handleSetGroupColor: (groupId: string, colorHex: string | null) => Promise<void>,
    handleReplaceGroupMembers: (groupId: string, memberIds: string[]) => Promise<void>,
}

const ScriptCharactersContext = createContext<ScriptCharactersContextValue | null>(null);

export const ScriptCharactersProvider = ({
    value,
    children,
}: {
    value: ScriptCharactersContextValue,
    children: ReactNode,
}) => (
    <ScriptCharactersContext.Provider value={value}>
        {children}
    </ScriptCharactersContext.Provider>
);

export const useScriptCharacters = (): ScriptCharactersContextValue => {
    const context = useContext(ScriptCharactersContext);

    if (!context) {
        throw new Error('useScriptCharacters must be used inside ScriptCharactersProvider');
    }

    return context;
};
