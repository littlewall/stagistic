import {
    focusFirstCharacterBlock,
    linkCharacterRef,
    useEditorElementSelection,
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

import {ATTRIBUTE_MANAGER_PANEL_CHARACTERS} from '../../attributes/attributeManagerMenu';
import {useScriptCharacters} from '../../ScriptCharactersContext';
import {useScriptSession} from '../../ScriptSessionContext';
import {useScriptSettingsModal} from '../../settings/ScriptSettingsModalProvider';
import {SidebarMiniHeader} from '../sidebar';
import {AttributeManagerSidebarButton} from '../sidebar/AttributeManagerSidebarButton';
import {SidebarActionsGroup} from '../sidebar/SidebarActionsGroup';
import {AddCharacterModal} from './AddCharacterModal';
import {CharactersSidebarContextActions} from './CharactersSidebarContextActions';
import styles from './ScriptCharactersSidebar.module.css';
import {useCharacterComputed} from './useCharacterComputed';

export const ScriptCharactersSidebar = () => {
    const {resolvedScriptSettings} = useScriptSession();
    const {openAttributeManagerCharacter} = useScriptSettingsModal();
    const characters = useScriptCharacters();
    const editor = useEditorInstance();
    const elementSelection = useEditorElementSelection();
    const liveCharacters = useEditorLiveCharacters();
    const [isAddCharacterOpen, setIsAddCharacterOpen] = useState(false);
    const openAddCharacterModal = useCallback(() => setIsAddCharacterOpen(true), []);
    const closeAddCharacterModal = useCallback(() => setIsAddCharacterOpen(false), []);

    const {
        confirmedCharacters,
        unconfirmedCharacters,
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

    return (
        <div className={styles.content}>
            <SidebarMiniHeader
                actions={<CharactersSidebarContextActions onAddCharacter={openAddCharacterModal} />}
                controls={(
                    <SidebarActionsGroup>
                        <AttributeManagerSidebarButton panelId={ATTRIBUTE_MANAGER_PANEL_CHARACTERS} />
                    </SidebarActionsGroup>
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
                    onEditCharacter: openAttributeManagerCharacter,
                    onFocusCharacter: handleFocusCharacter,
                }}
                options={{
                    activeCharacterId: elementSelection?.type === 'character'
                        ? elementSelection.characterId
                        : null,
                    activeCharacterKey: elementSelection?.type === 'character'
                        ? elementSelection.characterKey
                        : null,
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
