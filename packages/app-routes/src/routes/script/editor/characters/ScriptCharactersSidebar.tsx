import {
    focusFirstCharacterBlock,
    linkCharacterRef,
    renameCharacterText,
    replaceCharacterRefId,
    unlinkCharacterRef,
    useEditorInstance,
    useEditorLiveCharacters,
} from '@stagistic/editor';
import {EditorSidebar} from '@stagistic/ui';
import {useCallback} from 'react';

import {useScriptCharacters} from '../../ScriptCharactersContext';
import {useScriptSession} from '../../ScriptSessionContext';
import {useCharacterComputed} from './useCharacterComputed';

export const ScriptCharactersSidebar = () => {
    const {resolvedScriptSettings} = useScriptSession();
    const characters = useScriptCharacters();
    const editor = useEditorInstance();
    const liveCharacters = useEditorLiveCharacters();

    const {
        confirmedCharacters,
        unconfirmedCharacters,
        getCharacterNameForBlockType,
    } = useCharacterComputed({
        data: {
            confirmedCharacterRecords: characters.confirmedCharacterRecords,
            characterSnapshot: liveCharacters,
            resolvedScriptSettings,
            characterColorSaturation: resolvedScriptSettings.visual.characterColorSaturation,
        },
        pending: {
            confirmingCharacterKeys: characters.pendingCharacterKeys,
            deletingCharacterIds: characters.deletingCharacterIds,
            renamingCharacterIds: characters.renamingCharacterIds,
            renamingCharacterKeys: characters.renamingCharacterKeys,
            colorUpdatingCharacterIds: characters.colorUpdatingCharacterIds,
            genderUpdatingCharacterIds: characters.genderUpdatingCharacterIds,
        },
    });

    const handleFocusCharacter = useCallback((characterKey: string) => {
        if (editor) {
            focusFirstCharacterBlock(editor, characterKey);
        }
    }, [editor]);

    const handleConfirmCharacter = useCallback((characterKey: string, colorHex?: string | null) => {
        characters.handleConfirmCharacter(characterKey, colorHex, {
            onLinkRef: (key, id) => {
                if (editor) {
                    linkCharacterRef(editor, key, id);
                }
            },
        });
    }, [characters, editor]);

    const handleDeleteCharacter = useCallback((characterId: string) => {
        characters.handleDeleteCharacter(characterId, {
            onUnlinkRef: id => {
                if (editor) {
                    unlinkCharacterRef(editor, id);
                }
            },
        });
    }, [characters, editor]);

    const handleRenameCharacterPreview = useCallback((
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
    ) => {
        characters.handleRenameCharacterPreview(characterId, previousCharacterName, nextCharacterName, {
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
        characters,
        editor,
        getCharacterNameForBlockType,
    ]);

    const handleRenameCharacter = useCallback((
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
    ) => {
        characters.handleRenameCharacter(characterId, previousCharacterName, nextCharacterName, {
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
        characters,
        editor,
        getCharacterNameForBlockType,
    ]);

    return (
        <EditorSidebar
            data={{
                confirmedCharacters,
                unconfirmedCharacters,
                characterGenderOptions: characters.characterGenderOptions,
                isLoading: characters.isCharactersLoading,
            }}
            actions={{
                onConfirmCharacter: handleConfirmCharacter,
                onDeleteCharacter: handleDeleteCharacter,
                onFocusCharacter: handleFocusCharacter,
                normalizeRenameInput: characters.normalizeCharacterNameForInlineInput,
                onRenameCharacterPreview: handleRenameCharacterPreview,
                onRenameCharacter: handleRenameCharacter,
                onSetCharacterColor: characters.handleSetCharacterColor,
                onSetCharacterGender: characters.handleSetCharacterGender,
                onUpsertCharacterGender: characters.handleUpsertCharacterGender,
            }}
            options={{
                characterColorSaturation: resolvedScriptSettings.visual.characterColorSaturation,
            }}
        />
    );
};
