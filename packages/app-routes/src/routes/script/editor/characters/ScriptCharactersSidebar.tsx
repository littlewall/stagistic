import {
    focusFirstCharacterBlock, linkCharacterRef, renameCharacterText, replaceCharacterRefId, unlinkCharacterRef, useEditorInstance, useEditorLiveCharacters,
} from '@stagistic/editor';
import {type EditorSettings} from '@stagistic/script';
import {
    EditorSidebar,
} from '@stagistic/ui';
import {useCallback} from 'react';

import type {
    ConfirmEditorCallbacks, DeleteEditorCallbacks, RenameEditorCallbacks, RenamePreviewEditorCallbacks,
} from './actions/types';
import type {
    CharacterGenderOption,
    ScriptCharacterRecord,
} from './types';
import {useCharacterComputed} from './useCharacterComputed';

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
    onConfirmCharacter: (characterKey: string, colorHex?: string | null, editorCallbacks?: ConfirmEditorCallbacks) => void,
    onDeleteCharacter: (characterId: string, editorCallbacks?: DeleteEditorCallbacks) => void,
    normalizeRenameInput: (value: string) => string,
    onRenameCharacterPreview: (
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
        editorCallbacks?: RenamePreviewEditorCallbacks,
    ) => void,
    onRenameCharacter: (
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
        editorCallbacks?: RenameEditorCallbacks,
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
    const editor = useEditorInstance();
    const liveCharacters = useEditorLiveCharacters();
    const {
        confirmedCharacters,
        unconfirmedCharacters,
        getCharacterNameForBlockType,
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

    const handleFocusCharacter = useCallback((characterKey: string) => {
        if (editor) {
            focusFirstCharacterBlock(editor, characterKey);
        }
    }, [editor]);

    const handleConfirmCharacter = useCallback((characterKey: string, colorHex?: string | null) => {
        actions.onConfirmCharacter(characterKey, colorHex, {
            onLinkRef: (key, id) => {
                if (editor) {
                    linkCharacterRef(editor, key, id);
                }
            },
        });
    }, [actions, editor]);

    const handleDeleteCharacter = useCallback((characterId: string) => {
        actions.onDeleteCharacter(characterId, {
            onUnlinkRef: id => {
                if (editor) {
                    unlinkCharacterRef(editor, id);
                }
            },
        });
    }, [actions, editor]);

    const handleRenameCharacterPreview = useCallback((
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
    ) => {
        actions.onRenameCharacterPreview(characterId, previousCharacterName, nextCharacterName, {
            onRenameText: (charId, newName) => {
                if (editor) {
                    renameCharacterText(
                        editor,
                        charId,
                        newName,
                        getCharacterNameForBlockType,
                        previousCharacterName,
                    );
                }
            },
        });
    }, [
        actions,
        editor,
        getCharacterNameForBlockType,
    ]);

    const handleRenameCharacter = useCallback((
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
    ) => {
        actions.onRenameCharacter(characterId, previousCharacterName, nextCharacterName, {
            onRenameText: (charId, newName) => {
                if (editor) {
                    renameCharacterText(
                        editor,
                        charId,
                        newName,
                        getCharacterNameForBlockType,
                        previousCharacterName,
                    );
                }
            },
            onReplaceId: (oldId, newId) => {
                if (editor) {
                    replaceCharacterRefId(editor, oldId, newId);
                }
            },
        });
    }, [
        actions,
        editor,
        getCharacterNameForBlockType,
    ]);

    return (
        <EditorSidebar
            data={{
                confirmedCharacters,
                unconfirmedCharacters,
                characterGenderOptions: data.characterGenderOptions,
                isLoading: data.isLoading,
            }}
            actions={{
                onConfirmCharacter: handleConfirmCharacter,
                onDeleteCharacter: handleDeleteCharacter,
                onFocusCharacter: handleFocusCharacter,
                normalizeRenameInput: actions.normalizeRenameInput,
                onRenameCharacterPreview: handleRenameCharacterPreview,
                onRenameCharacter: handleRenameCharacter,
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
