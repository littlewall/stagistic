import {
    focusFirstCharacterBlock,
    getConfirmedCharacterColor,
    linkCharacterRef,
    useEditorElementSelection,
    useEditorInstance,
    useEditorLiveCharacters,
} from '@stagistic/editor';
import {
    normalizeCharacterColorHex,
    normalizeCharacterKey,
} from '@stagistic/script';
import {
    EditorSidebar,
    type EditorSidebarGroup,
    SidebarActionsGroup,
    SidebarMiniHeader,
} from '@stagistic/ui';
import {
    type ReactNode,
    useCallback,
    useMemo,
    useState,
} from 'react';

import {ATTRIBUTE_MANAGER_PANEL_CHARACTERS} from '../../attributes/attributeManagerMenu';
import {useScriptCharacters} from '../../ScriptCharactersContext';
import {useScriptSession} from '../../ScriptSessionContext';
import {useScriptSettingsModal} from '../../settings/ScriptSettingsModalProvider';
import {AttributeManagerSidebarButton} from '../sidebar/AttributeManagerSidebarButton';
import {AddCharacterModal} from './AddCharacterModal';
import {CharactersSidebarContextActions} from './CharactersSidebarContextActions';
import styles from './ScriptCharactersSidebar.module.css';
import {useCharacterComputed} from './useCharacterComputed';

interface ScriptCharactersSidebarProps {
    header?: ReactNode,
}

export const ScriptCharactersSidebar = ({header}: ScriptCharactersSidebarProps) => {
    const {resolvedScriptSettings} = useScriptSession();
    const {
        openAttributeManagerCharacter,
        openAttributeManagerGroup,
    } = useScriptSettingsModal();
    const characters = useScriptCharacters();
    const editor = useEditorInstance();
    const elementSelection = useEditorElementSelection();
    const liveCharacters = useEditorLiveCharacters();
    const [isAddCharacterOpen, setIsAddCharacterOpen] = useState(false);
    const openAddCharacterModal = useCallback(() => setIsAddCharacterOpen(true), []);
    const closeAddCharacterModal = useCallback(() => setIsAddCharacterOpen(false), []);

    const {
        confirmedCharacters,
        normalizedConfirmedGroupRecords,
        unconfirmedCharacters,
    } = useCharacterComputed({
        data: {
            confirmedCharacterRecords: characters.confirmedCharacterRecords,
            confirmedGroupRecords: characters.confirmedGroupRecords,
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
    const groups = useMemo<EditorSidebarGroup[]>(() => normalizedConfirmedGroupRecords.map(group => {
        const normalizedColorHex = normalizeCharacterColorHex(group.colorHex);

        return {
            id: group.id,
            key: group.key,
            color: getConfirmedCharacterColor(
                group.id,
                normalizedColorHex,
                resolvedScriptSettings.visual.characterColorSaturation,
            ),
            colorHex: normalizedColorHex ?? null,
            isConfirmed: true,
            isEmpty: group.memberIds.length === 0,
            isColorUpdatePending: characters.colorUpdatingGroupIds.includes(group.id),
        };
    }), [
        characters.colorUpdatingGroupIds,
        normalizedConfirmedGroupRecords,
        resolvedScriptSettings.visual.characterColorSaturation,
    ]);

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
    const occupiedCharacterKeys = useMemo(() => {
        return new Set([...characters.confirmedCharacterRecords, ...characters.confirmedGroupRecords].map(entity => normalizeCharacterKey(entity.key)));
    }, [characters.confirmedCharacterRecords, characters.confirmedGroupRecords]);
    const handleSetGroupColor = useCallback((groupId: string, colorHex: string | null) => {
        void characters.handleSetGroupColor(groupId, colorHex).catch(() => undefined);
    }, [characters]);

    return (
        <div className={styles.content}>
            <SidebarMiniHeader
                navigation={header}
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
                    groups,
                    unconfirmedCharacters,
                    characterColorSaturation: resolvedScriptSettings.visual.characterColorSaturation,
                    isLoading: characters.isCharactersLoading,
                }}
                actions={{
                    onConfirmCharacter: handleConfirmCharacter,
                    onEditCharacter: openAttributeManagerCharacter,
                    onEditGroup: openAttributeManagerGroup,
                    onFocusCharacter: handleFocusCharacter,
                    onSetGroupColor: handleSetGroupColor,
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
                occupiedCharacterKeys={occupiedCharacterKeys}
                onClose={closeAddCharacterModal}
                onCreate={handleAddCharacter}
            />
        </div>
    );
};
