import {getScriptSnapshotLabel} from '@stagistic/app-core';
import {
    type AttributeManagerCharacter,
    AttributeManagerCharactersPanel,
    type AttributeManagerGroup,
    type AttributeManagerListItem,
    AttributeManagerListPanel,
    AttributeManagerModal,
    AttributeManagerPlacesPanel,
    AttributeManagerSceneDetail,
    Button,
    type ModalFocusRestoreOptions,
    ReadOnlyNotice,
    Tooltip,
    TrashIcon,
} from '@stagistic/ui';

import type {useScriptMusicState} from '../editor/music/useScriptMusicState';
import {useScriptReadOnlyState} from '../workspace/ScriptAccessContext';
import type {useScriptCharactersContextValue} from '../workspace/useScriptCharactersContextValue';
import {
    ATTRIBUTE_MANAGER_PANEL_CHARACTERS,
    ATTRIBUTE_MANAGER_PANEL_MUSIC,
    ATTRIBUTE_MANAGER_PANEL_PLACES,
    ATTRIBUTE_MANAGER_PANEL_STRUCTURE,
    type AttributeManagerPanelId,
} from './attributeManagerMenu';
import {MusicAttachmentsDetail} from './MusicAttachmentsDetail';
import styles from './ScriptAttributeManagerModal.module.css';
import {useAttributeManagerActionDialogs} from './useAttributeManagerActionDialogs';
import type {useAttributeManagerModalState} from './useAttributeManagerModalState';
import type {useMusicAttachmentsState} from './useMusicAttachmentsState';
import type {useScriptPlacesState} from './useScriptPlacesState';

interface ScriptAttributeManagerModalProps extends ModalFocusRestoreOptions {
    currentScriptId: string | null,
    isOpen: boolean,
    tabs: ReturnType<typeof useAttributeManagerModalState>['tabs'],
    activePanelId: AttributeManagerPanelId,
    selectedCharacterId: string | null,
    selectedGroupId?: string | null,
    selectedMusicId: string | null,
    initialWorkspaceId?: ReturnType<typeof useAttributeManagerModalState>['initialWorkspaceId'],
    onClose: () => void,
    onSelectPanel: (panelId: string) => void,
    characters: ReturnType<typeof useScriptCharactersContextValue>['contextValue'],
    characterItems: AttributeManagerCharacter[],
    groupItems: AttributeManagerGroup[],
    sceneItems: AttributeManagerListItem[],
    firstSceneHeadingBlockId: string | null,
    onDeleteScene: (sceneHeadingBlockId: string) => Promise<void>,
    placeState: ReturnType<typeof useScriptPlacesState>,
    musicState: ReturnType<typeof useScriptMusicState>,
    musicItems: AttributeManagerListItem[],
    musicAttachmentsState: ReturnType<typeof useMusicAttachmentsState>,
    setMusicTitleDraft: (musicId: string, title: string) => void,
    persistMusicTitleDraft: (musicId: string, title: string, persist: (title: string) => void | Promise<unknown>) => Promise<void>,
    onDeleteMusic: (musicId: string) => Promise<void>,
}

export const ScriptAttributeManagerModal = ({
    returnFocus,
    fallbackFocus,
    currentScriptId,
    isOpen,
    tabs,
    activePanelId,
    selectedCharacterId,
    selectedGroupId = null,
    selectedMusicId,
    initialWorkspaceId = 'characters',
    onClose,
    onSelectPanel,
    characters,
    characterItems,
    groupItems,
    sceneItems,
    firstSceneHeadingBlockId,
    onDeleteScene,
    placeState,
    musicState,
    musicItems,
    musicAttachmentsState,
    setMusicTitleDraft,
    persistMusicTitleDraft,
    onDeleteMusic,
}: ScriptAttributeManagerModalProps) => {
    const {isReadOnly, snapshot} = useScriptReadOnlyState();
    const {music: musicCatalog} = musicState;
    const {
        dialogs,
        createdMusicId,
        isDeletingMusic,
        isDeletingScene,
        requestCreateMusic,
        requestDeleteMusic,
        requestDeleteScene,
    } = useAttributeManagerActionDialogs({
        createMusic: musicState.createMusic,
        onDeleteMusic,
        onDeleteScene,
    });

    return (
        <>
            <AttributeManagerModal
                returnFocus={returnFocus}
                fallbackFocus={fallbackFocus}
                isOpen={isOpen}
                tabs={tabs}
                activeTabId={activePanelId}
                notice={isReadOnly ? <ReadOnlyNotice label={snapshot ? getScriptSnapshotLabel(snapshot) : null} /> : null}
                onClose={onClose}
                onSelectTab={onSelectPanel}
            >
                {activePanelId === ATTRIBUTE_MANAGER_PANEL_STRUCTURE ? (
                    <AttributeManagerListPanel
                        items={sceneItems}
                        detailTypeLabel="Scene"
                        emptyListLabel="No scenes yet"
                        emptyDetailLabel="Select a scene"
                        isReadOnly={isReadOnly}
                        renderDetailAction={item => {
                            if (isReadOnly || item.id === firstSceneHeadingBlockId) {
                                return null;
                            }

                            return (
                                <Tooltip label="Delete scene heading" placement="left">
                                    <Button
                                        className={styles.deleteButton}
                                        variant="ghost"
                                        size="sm"
                                        isDisabled={isDeletingScene}
                                        aria-label="Delete scene heading"
                                        onPress={event => requestDeleteScene(item, event.target as HTMLElement)}
                                    >
                                        <TrashIcon className={styles.actionIcon} aria-hidden="true" />
                                    </Button>
                                </Tooltip>
                            );
                        }}
                        renderDetail={item => (
                            <AttributeManagerSceneDetail
                                places={placeState.places}
                                selectedPlaceIds={placeState.scenePlaceIds[item.id] ?? []}
                                onChangePlaceIds={placeIds => {
                                    void placeState.setScenePlaces(item.id, placeIds);
                                }}
                            />
                        )}
                    />
                ) : null}
                {activePanelId === ATTRIBUTE_MANAGER_PANEL_CHARACTERS ? (
                    <AttributeManagerCharactersPanel
                        characters={characterItems}
                        groups={groupItems}
                        initialSelectedCharacterId={selectedCharacterId}
                        initialSelectedGroupId={selectedGroupId}
                        initialWorkspaceId={initialWorkspaceId}
                        isLoading={characters.isCharactersLoading}
                        draftScopeKey={currentScriptId}
                        deletingCharacterIds={characters.deletingCharacterIds}
                        renamingCharacterIds={characters.renamingCharacterIds}
                        colorUpdatingCharacterIds={characters.colorUpdatingCharacterIds}
                        deletingGroupIds={characters.deletingGroupIds}
                        renamingGroupIds={characters.renamingGroupIds}
                        colorUpdatingGroupIds={characters.colorUpdatingGroupIds}
                        onSetCharacterColor={characters.handleSetCharacterColor}
                        onSetCharacterOutline={characters.handleSetCharacterOutline}
                        onSetCharacterVoiceType={characters.handleSetCharacterVoiceType}
                        onSetCharacterVocalRange={characters.handleSetCharacterVocalRange}
                        onDeleteCharacter={characters.handleDeleteCharacter}
                        onCreateCharacter={characters.handleConfirmCharacter}
                        onRenameCharacter={characters.handleRenameCharacter}
                        onCreateGroup={characters.handleCreateGroup}
                        onRenameGroup={characters.handleRenameGroup}
                        onDeleteGroup={characters.handleDeleteGroup}
                        onSetGroupColor={characters.handleSetGroupColor}
                        onChangeGroupMemberIds={characters.handleReplaceGroupMembers}
                        isReadOnly={isReadOnly}
                    />
                ) : null}
                {activePanelId === ATTRIBUTE_MANAGER_PANEL_MUSIC ? (
                    <AttributeManagerListPanel
                        items={musicItems}
                        initialSelectedItemId={createdMusicId ?? selectedMusicId}
                        detailTypeLabel="Music"
                        hideDetailTypeLabel
                        wrapDetailTitle
                        emptyListLabel="No music yet"
                        emptyDetailLabel="Select music"
                        search={{ariaLabel: 'Search music', placeholder: 'Search music'}}
                        createAction={isReadOnly ? undefined : {
                            ariaLabel: 'Create music',
                            tooltipLabel: 'Create music',
                            onPress: requestCreateMusic,
                        }}
                        isReadOnly={isReadOnly}
                        renderDetailAction={item => (isReadOnly ? null : (
                            <Tooltip label={`Delete ${item.title}`} placement="left">
                                <Button
                                    className={styles.deleteButton}
                                    variant="ghost"
                                    size="sm"
                                    isDisabled={isDeletingMusic}
                                    aria-label={`Delete ${item.title}`}
                                    onPress={event => requestDeleteMusic(item, event.target as HTMLElement)}
                                >
                                    <TrashIcon className={styles.actionIcon} aria-hidden="true" />
                                </Button>
                            </Tooltip>
                        ))}
                        renderDetail={item => {
                            const music = musicCatalog.find(candidate => candidate.id === item.id);

                            return music ? (
                                <MusicAttachmentsDetail
                                    music={music}
                                    displayTitle={item.title}
                                    state={musicAttachmentsState}
                                    onTitleDraftChange={title => setMusicTitleDraft(music.id, title)}
                                    onUpdateMusic={(musicId, input) => persistMusicTitleDraft(
                                        musicId,
                                        input.title,
                                        title => musicState.updateMusic(musicId, {...input, title}),
                                    )}
                                />
                            ) : null;
                        }}
                    />
                ) : null}
                {activePanelId === ATTRIBUTE_MANAGER_PANEL_PLACES ? (
                    <AttributeManagerPlacesPanel
                        places={placeState.places}
                        isLoading={placeState.isLoading}
                        draftScopeKey={currentScriptId}
                        onCreatePlace={placeState.createPlace}
                        onRenamePlace={placeState.renamePlace}
                        onDeletePlace={placeState.deletePlace}
                        isReadOnly={isReadOnly}
                    />
                ) : null}
            </AttributeManagerModal>
            {dialogs}
        </>
    );
};
