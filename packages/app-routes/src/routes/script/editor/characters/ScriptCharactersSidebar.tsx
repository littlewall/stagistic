import {useEditorLiveCharacters} from '@stagistic/editor-ui';
import {type EditorSettings} from '@stagistic/script-core';
import {
    EditorSidebar,
} from '@stagistic/ui';

import {useCharacterComputed} from './useCharacterComputed';
import type {
    CharacterGenderOption,
    ScriptCharacterRecord,
} from './types';

interface ScriptCharactersSidebarData {
    confirmedCharacterRecords: ScriptCharacterRecord[],
    pendingCharacterKeys: string[],
    deletingCharacterIds: string[],
    renamingCharacterIds: string[],
    renamingCharacterKeys: string[],
    colorUpdatingCharacterIds: string[],
    genderUpdatingCharacterIds: string[],
    characterGenderOptions: CharacterGenderOption[],
    resolvedScriptSettings: EditorSettings,
    characterColorSaturation: number,
    isLoading: boolean,
    className?: string,
}

interface ScriptCharactersSidebarActions {
    onConfirmCharacter: (characterKey: string) => void,
    onDeleteCharacter: (characterId: string) => void,
    normalizeRenameInput: (value: string) => string,
    onRenameCharacterPreview: (
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
    ) => void,
    onRenameCharacter: (
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
    ) => void,
    onSetCharacterColor: (characterId: string, colorHex: string | null) => void,
    onSetCharacterGender: (characterId: string, genderKey: string | null) => void,
    onUpsertCharacterGender: (label: string) => Promise<CharacterGenderOption | null>,
}

export interface ScriptCharactersSidebarProps {
    data: ScriptCharactersSidebarData,
    actions: ScriptCharactersSidebarActions,
}

export const ScriptCharactersSidebar = ({
    data,
    actions,
}: ScriptCharactersSidebarProps) => {
    const liveCharacters = useEditorLiveCharacters();
    const {
        confirmedCharacters,
        unconfirmedCharacters,
    } = useCharacterComputed({
        data: {
            confirmedCharacterRecords: data.confirmedCharacterRecords,
            characterSnapshot: liveCharacters,
            resolvedScriptSettings: data.resolvedScriptSettings,
            characterColorSaturation: data.characterColorSaturation,
        },
        pending: {
            confirmingCharacterKeys: data.pendingCharacterKeys,
            deletingCharacterIds: data.deletingCharacterIds,
            renamingCharacterIds: data.renamingCharacterIds,
            renamingCharacterKeys: data.renamingCharacterKeys,
            colorUpdatingCharacterIds: data.colorUpdatingCharacterIds,
            genderUpdatingCharacterIds: data.genderUpdatingCharacterIds,
        },
    });

    return (
        <EditorSidebar
            data={{
                confirmedCharacters,
                unconfirmedCharacters,
                characterGenderOptions: data.characterGenderOptions,
                isLoading: data.isLoading,
            }}
            actions={{
                onConfirmCharacter: actions.onConfirmCharacter,
                onDeleteCharacter: actions.onDeleteCharacter,
                normalizeRenameInput: actions.normalizeRenameInput,
                onRenameCharacterPreview: actions.onRenameCharacterPreview,
                onRenameCharacter: actions.onRenameCharacter,
                onSetCharacterColor: actions.onSetCharacterColor,
                onSetCharacterGender: actions.onSetCharacterGender,
                onUpsertCharacterGender: actions.onUpsertCharacterGender,
            }}
            options={{
                characterColorSaturation: data.characterColorSaturation,
                className: data.className,
            }}
        />
    );
};
