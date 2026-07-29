import type {EditorSettings} from '@stagistic/script';
import {
    type AttributeManagerCharacter,
    AttributeManagerCharactersPanel,
    type AttributeManagerListItem,
    AttributeManagerListPanel,
    AttributeManagerModal,
    AttributeManagerPlacesPanel,
    AttributeManagerSceneDetail,
    Button,
    Tooltip,
    TrashIcon,
} from '@stagistic/ui';
import {useState} from 'react';

import {
    ATTRIBUTE_MANAGER_PANEL_CHARACTERS,
    ATTRIBUTE_MANAGER_PANEL_MUSIC,
    ATTRIBUTE_MANAGER_PANEL_PLACES,
    ATTRIBUTE_MANAGER_PANEL_STRUCTURE,
    type AttributeManagerPanelId,
} from '../attributes/attributeManagerMenu';
import {MusicAttachmentsDetail} from '../attributes/MusicAttachmentsDetail';
import type {useAttributeManagerModalState} from '../attributes/useAttributeManagerModalState';
import type {useMusicAttachmentsState} from '../attributes/useMusicAttachmentsState';
import type {useScriptPlacesState} from '../attributes/useScriptPlacesState';
import {
    AddMusicModal,
    DeleteMusicModal,
    type useScriptMusicState,
} from '../editor/music';
import type {useScriptCharactersContextValue} from '../useScriptCharactersContextValue';
import styles from './ScriptAttributeManagerModal.module.css';

interface ScriptAttributeManagerModalProps {
    currentScriptId: string | null,
    isOpen: boolean,
    tabs: ReturnType<typeof useAttributeManagerModalState>['tabs'],
    activePanelId: AttributeManagerPanelId,
    selectedCharacterId: string | null,
    selectedMusicId: string | null,
    onClose: () => void,
    onSelectPanel: (panelId: string) => void,
    characters: ReturnType<typeof useScriptCharactersContextValue>['contextValue'],
    characterItems: AttributeManagerCharacter[],
    characterColorSaturation: EditorSettings['visual']['characterColorSaturation'],
    sceneItems: AttributeManagerListItem[],
    placeState: ReturnType<typeof useScriptPlacesState>,
    musicState: ReturnType<typeof useScriptMusicState>,
    musicItems: AttributeManagerListItem[],
    musicAttachmentsState: ReturnType<typeof useMusicAttachmentsState>,
    setMusicTitleDraft: (musicId: string, title: string) => void,
    persistMusicTitleDraft: (
        musicId: string,
        title: string,
        persist: (title: string) => void | Promise<unknown>,
    ) => Promise<void>,
    onDeleteMusic: (musicId: string) => Promise<void>,
}

export const ScriptAttributeManagerModal = ({
    currentScriptId,
    isOpen,
    tabs,
    activePanelId,
    selectedCharacterId,
    selectedMusicId,
    onClose,
    onSelectPanel,
    characters,
    characterItems,
    characterColorSaturation,
    sceneItems,
    placeState,
    musicState,
    musicItems,
    musicAttachmentsState,
    setMusicTitleDraft,
    persistMusicTitleDraft,
    onDeleteMusic,
}: ScriptAttributeManagerModalProps) => {
    const {music: musicCatalog} = musicState;
    const [isAddMusicOpen, setIsAddMusicOpen] = useState(false);
    const [createdMusicId, setCreatedMusicId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AttributeManagerListItem | null>(null);
    const [isDeletingMusic, setIsDeletingMusic] = useState(false);

    return (
        <>
            <AttributeManagerModal
                isOpen={isOpen}
                tabs={tabs}
                activeTabId={activePanelId}
                onClose={onClose}
                onSelectTab={onSelectPanel}
            >
                {activePanelId === ATTRIBUTE_MANAGER_PANEL_STRUCTURE ? (
                    <AttributeManagerListPanel
                        items={sceneItems}
                        detailTypeLabel="Scene"
                        emptyListLabel="No scenes yet"
                        emptyDetailLabel="Select a scene"
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
                        initialSelectedCharacterId={selectedCharacterId}
                        isLoading={characters.isCharactersLoading}
                        characterColorSaturation={characterColorSaturation}
                        draftScopeKey={currentScriptId}
                        deletingCharacterIds={characters.deletingCharacterIds}
                        renamingCharacterIds={characters.renamingCharacterIds}
                        colorUpdatingCharacterIds={characters.colorUpdatingCharacterIds}
                        onSetCharacterColor={characters.handleSetCharacterColor}
                        onSetCharacterOutline={characters.handleSetCharacterOutline}
                        onDeleteCharacter={characters.handleDeleteCharacter}
                        onCreateCharacter={characters.handleConfirmCharacter}
                        onRenameCharacter={characters.handleRenameCharacter}
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
                        createAction={{
                            ariaLabel: 'Create music',
                            tooltipLabel: 'Create music',
                            onPress: () => setIsAddMusicOpen(true),
                        }}
                        renderDetailAction={item => (
                            <Tooltip label={`Delete ${item.title}`} placement="left">
                                <Button
                                    className={styles.deleteButton}
                                    variant="ghost"
                                    size="sm"
                                    isDisabled={isDeletingMusic}
                                    aria-label={`Delete ${item.title}`}
                                    onPress={() => setDeleteTarget(item)}
                                >
                                    <TrashIcon className={styles.actionIcon} aria-hidden="true" />
                                </Button>
                            </Tooltip>
                        )}
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
                    />
                ) : null}
            </AttributeManagerModal>
            <AddMusicModal
                isOpen={isAddMusicOpen}
                onCancel={() => setIsAddMusicOpen(false)}
                onClose={() => setIsAddMusicOpen(false)}
                onCreate={async input => {
                    const created = await musicState.createMusic(input);

                    setCreatedMusicId(created?.id ?? null);

                    return created;
                }}
            />
            <DeleteMusicModal
                isOpen={deleteTarget !== null}
                isDeleting={isDeletingMusic}
                musicTitle={deleteTarget?.title}
                onClose={() => setDeleteTarget(null)}
                onConfirm={async () => {
                    if (!deleteTarget) {
                        return;
                    }

                    setIsDeletingMusic(true);

                    try {
                        await onDeleteMusic(deleteTarget.id);
                        setDeleteTarget(null);
                    } catch {
                        // Keep the dialog open; persistence errors are surfaced by the catalog.
                    } finally {
                        setIsDeletingMusic(false);
                    }
                }}
            />
        </>
    );
};
