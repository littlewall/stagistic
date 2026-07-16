import type {EditorSettings} from '@stagistic/script';
import {
    type AttributeManagerCharacter,
    AttributeManagerCharactersPanel,
    type AttributeManagerListItem,
    AttributeManagerListPanel,
    AttributeManagerModal,
    AttributeManagerPlacesPanel,
    AttributeManagerSceneDetail,
} from '@stagistic/ui';

import {
    ATTRIBUTE_MANAGER_PANEL_CHARACTERS,
    ATTRIBUTE_MANAGER_PANEL_CUES,
    ATTRIBUTE_MANAGER_PANEL_PLACES,
    ATTRIBUTE_MANAGER_PANEL_STRUCTURE,
    type AttributeManagerPanelId,
} from '../attributes/attributeManagerMenu';
import {CueAttachmentsDetail} from '../attributes/CueAttachmentsDetail';
import type {useAttributeManagerModalState} from '../attributes/useAttributeManagerModalState';
import type {useCueAttachmentsState} from '../attributes/useCueAttachmentsState';
import type {useScriptPlacesState} from '../attributes/useScriptPlacesState';
import type {useScriptCuesState} from '../editor/cues';
import type {useScriptCharactersContextValue} from '../useScriptCharactersContextValue';

interface ScriptAttributeManagerModalProps {
    currentScriptId: string | null,
    isOpen: boolean,
    tabs: ReturnType<typeof useAttributeManagerModalState>['tabs'],
    activePanelId: AttributeManagerPanelId,
    selectedCharacterId: string | null,
    selectedCueId: string | null,
    onClose: () => void,
    onSelectPanel: (panelId: string) => void,
    characters: ReturnType<typeof useScriptCharactersContextValue>['contextValue'],
    characterItems: AttributeManagerCharacter[],
    characterColorSaturation: EditorSettings['visual']['characterColorSaturation'],
    sceneItems: AttributeManagerListItem[],
    placeState: ReturnType<typeof useScriptPlacesState>,
    cueState: ReturnType<typeof useScriptCuesState>,
    cueItems: AttributeManagerListItem[],
    cueAttachmentsState: ReturnType<typeof useCueAttachmentsState>,
    setCueTitleDraft: (cueId: string, title: string) => void,
    persistCueTitleDraft: (
        cueId: string,
        title: string,
        persist: (title: string) => void | Promise<unknown>,
    ) => Promise<void>,
}

export const ScriptAttributeManagerModal = ({
    currentScriptId,
    isOpen,
    tabs,
    activePanelId,
    selectedCharacterId,
    selectedCueId,
    onClose,
    onSelectPanel,
    characters,
    characterItems,
    characterColorSaturation,
    sceneItems,
    placeState,
    cueState,
    cueItems,
    cueAttachmentsState,
    setCueTitleDraft,
    persistCueTitleDraft,
}: ScriptAttributeManagerModalProps) => {
    const {cues} = cueState;

    return (
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
                    detailPlaceholder="Scene details are coming soon."
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
                    deletingCharacterIds={characters.deletingCharacterIds}
                    colorUpdatingCharacterIds={characters.colorUpdatingCharacterIds}
                    onSetCharacterColor={characters.handleSetCharacterColor}
                    onSetCharacterOutline={characters.handleSetCharacterOutline}
                    onDeleteCharacter={characters.handleDeleteCharacter}
                    onCreateCharacter={characters.handleConfirmCharacter}
                />
            ) : null}
            {activePanelId === ATTRIBUTE_MANAGER_PANEL_CUES ? (
                <AttributeManagerListPanel
                    items={cueItems}
                    initialSelectedItemId={selectedCueId}
                    detailTypeLabel="Cue"
                    emptyListLabel="No cues yet"
                    emptyDetailLabel="Select a cue"
                    detailPlaceholder="Cue details are coming soon."
                    renderDetail={item => {
                        const cue = cues.find(candidate => candidate.id === item.id);

                        return cue ? (
                            <CueAttachmentsDetail
                                cue={cue}
                                displayTitle={item.title}
                                state={cueAttachmentsState}
                                onTitleDraftChange={title => setCueTitleDraft(cue.id, title)}
                                onUpdateCue={(cueId, input) => persistCueTitleDraft(
                                    cueId,
                                    input.title,
                                    title => cueState.updateCue(cueId, {...input, title}),
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
    );
};
