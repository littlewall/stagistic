import {
    focusFirstCharacterBlock,
    linkCharacterRef,
    renameCharacterText,
    replaceCharacterRefId,
    unlinkCharacterRef,
    useEditorInstance,
    useEditorLiveCharacters,
} from '@stagistic/editor';
import {normalizeCharacterKey} from '@stagistic/script';
import {EditorSidebar} from '@stagistic/ui';
import {
    useCallback,
    useMemo,
    useState,
} from 'react';

import {useScriptCharacters} from '../../ScriptCharactersContext';
import {useScriptSession} from '../../ScriptSessionContext';
import {SidebarMiniHeader} from '../sidebar';
import {AddCharacterModal} from './AddCharacterModal';
import {CharactersSidebarContextActions} from './CharactersSidebarContextActions';
import styles from './ScriptCharactersSidebar.module.css';
import {useCharacterComputed} from './useCharacterComputed';

export const ScriptCharactersSidebar = () => {
    const {resolvedScriptSettings} = useScriptSession();
    const characters = useScriptCharacters();
    const editor = useEditorInstance();
    const liveCharacters = useEditorLiveCharacters();
    const [isAddCharacterOpen, setIsAddCharacterOpen] = useState(false);
    const openAddCharacterModal = useCallback(() => setIsAddCharacterOpen(true), []);
    const closeAddCharacterModal = useCallback(() => setIsAddCharacterOpen(false), []);

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
    const handleAddCharacter = useCallback((characterKey: string) => {
        characters.handleConfirmCharacter(characterKey, undefined, {
            onLinkRef: (key, id) => {
                if (editor) {
                    linkCharacterRef(editor, key, id);
                }
            },
        });
    }, [characters, editor]);
    const confirmedCharacterKeys = useMemo(() => {
        return new Set(characters.confirmedCharacterRecords.map(character => normalizeCharacterKey(character.key)));
    }, [characters.confirmedCharacterRecords]);

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
        <div className={styles.content}>
            <SidebarMiniHeader
                actions={(
                    <CharactersSidebarContextActions onAddCharacter={openAddCharacterModal} />
                )}
            />
            <EditorSidebar
                data={{
                    confirmedCharacters,
                    unconfirmedCharacters,
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
                    onSetCharacterOutline: characters.handleSetCharacterOutline,
                }}
                options={{
                    characterColorSaturation: resolvedScriptSettings.visual.characterColorSaturation,
                    className: styles.sidebar,
                }}
            />
            <AddCharacterModal
                isOpen={isAddCharacterOpen}
                existingCharacterKeys={confirmedCharacterKeys}
                onClose={closeAddCharacterModal}
                onCreate={handleAddCharacter}
            />
        </div>
    );
};
