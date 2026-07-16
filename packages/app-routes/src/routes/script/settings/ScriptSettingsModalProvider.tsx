import {
    useScriptRepository,
    useScripts,
} from '@stagistic/app-core';
import {
    useEditorLiveCharacters,
    useEditorLiveCues,
    useEditorLiveStructure,
} from '@stagistic/editor';
import {
    buildScriptStructureOutline,
    type EditorSettings,
    type EditorSettingsOverride,
    type TitlePageSettings,
} from '@stagistic/script';
import {isApplePlatform} from '@stagistic/shared';
import {
    type AttributeManagerCharacter,
    AttributeManagerCharactersPanel,
    type AttributeManagerListItem,
    AttributeManagerListPanel,
    AttributeManagerModal,
    AttributeManagerPlacesPanel,
    AttributeManagerSceneDetail,
    ScriptSettingsModal,
    useKeyedFieldDrafts,
} from '@stagistic/ui';
import {
    createContext,
    type ReactNode,
    useContext,
    useMemo,
} from 'react';
import {
    useNavigate,
    useSearchParams,
} from 'react-router-dom';

import {
    ATTRIBUTE_MANAGER_PANEL_CHARACTERS,
    ATTRIBUTE_MANAGER_PANEL_CUES,
    ATTRIBUTE_MANAGER_PANEL_PLACES,
    ATTRIBUTE_MANAGER_PANEL_STRUCTURE,
    type AttributeManagerPanelId,
} from '../attributes/attributeManagerMenu';
import {CueAttachmentsDetail} from '../attributes/CueAttachmentsDetail';
import {useAttributeManagerModalState} from '../attributes/useAttributeManagerModalState';
import {useCueAttachmentsState} from '../attributes/useCueAttachmentsState';
import {useScriptPlacesState} from '../attributes/useScriptPlacesState';
import {useScriptCuesState} from '../editor/cues';
import {ScriptEditorSettingsPanel} from '../editor/settings';
import {ScriptCharactersProvider} from '../ScriptCharactersContext';
import {useScriptWorkspace} from '../ScriptWorkspaceContext';
import {useScriptCharactersContextValue} from '../useScriptCharactersContextValue';
import {useScriptEditorSettingsDraft} from '../useScriptEditorSettingsDraft';
import {useScriptEditorSettingsModal} from '../useScriptEditorSettingsModal';
import {useScriptTitleDraft} from '../useScriptTitleDraft';
import {useTitlePageDraft} from '../useTitlePageDraft';
import {
    buildAttributeManagerCueItems,
    buildAttributeManagerCueItemsFromLive,
} from './attributeManagerCueItems';
import {DraftSaveError} from './DraftSaveError';
import {SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS} from './settingsMenu';

const BLOCK_LABEL_BY_TYPE = new Map(
    SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS.map(item => [item.blockType, item.label] as const),
);

/*
 * Values every script view (editor, export, future ones) reads from the shared
 * settings host: the resolved settings that drive the view, plus the drafts and
 * the workspace modal entry points wired to the app header.
 */
interface ScriptSettingsModalContextValue {
    resolvedScriptSettings: EditorSettings,
    effectiveScriptSettingsDraft: EditorSettingsOverride,
    titlePageDraft: TitlePageSettings,
    scriptTitleDraft: string,
    cueState: ReturnType<typeof useScriptCuesState>,
    openSettingsModal: () => void,
    openAttributeManagerModal: () => void,
    openAttributeManagerModalWithPanel: (panelId: AttributeManagerPanelId) => void,
    openAttributeManagerCharacter: (characterId: string) => void,
    openAttributeManagerCue: (cueId: string) => void,
}

const ScriptSettingsModalContext = createContext<ScriptSettingsModalContextValue | null>(null);

export const useScriptSettingsModal = (): ScriptSettingsModalContextValue => {
    const context = useContext(ScriptSettingsModalContext);

    if (!context) {
        throw new Error('useScriptSettingsModal must be used inside ScriptSettingsModalProvider');
    }

    return context;
};

/*
 * Owns the script settings/title-page/title drafts and the settings modal once,
 * at the workspace level, so every view shares a single modal and a single set
 * of debounced savers. Views open it via `useScriptSettingsModal().openSettingsModal`.
 */
export const ScriptSettingsModalProvider = ({children}: {children: ReactNode}) => {
    const liveCharacters = useEditorLiveCharacters();
    const liveCues = useEditorLiveCues();
    const liveStructure = useEditorLiveStructure();
    const navigate = useNavigate();
    const scriptRepository = useScriptRepository();
    const {deleteScript, renameScriptTitle} = useScripts();
    const [searchParams, setSearchParams] = useSearchParams();
    const {
        currentScript,
        currentScriptId,
        initialValue,
        handleAutoSave,
    } = useScriptWorkspace();
    const {
        effectiveScriptSettingsDraft,
        resolvedScriptSettings,
        updateBlockSettings,
        resetBlockSettings,
        updateCharacterColorSaturation,
        updateStructureSettings,
        updatePageSettings,
        updateHeaderFooterSettings,
        updateInitialPagesSettings,
        scriptSettingsDraftError,
        retryScriptSettings,
    } = useScriptEditorSettingsDraft({
        currentScriptId,
        repository: scriptRepository,
    });
    const {
        titlePageDraft,
        updateTitlePage,
        titlePageDraftError,
        retryTitlePage,
    } = useTitlePageDraft({
        currentScriptId,
        repository: scriptRepository,
    });
    const {
        scriptTitleDraft,
        updateScriptTitle,
        scriptTitleDraftError,
        retryScriptTitle,
    } = useScriptTitleDraft({
        currentScriptId,
        currentScriptTitle: currentScript?.name ?? '',
        renameScriptTitle,
    });
    const {
        isSettingsOpen,
        activePanelId,
        expandedItemIds,
        groups,
        openSettingsModal,
        handleCloseSettings,
        handleSelectSettingsPanel,
        handleDeleteScript,
        toggleExpanded,
    } = useScriptEditorSettingsModal({
        currentScriptId,
        navigate,
        searchParams,
        setSearchParams,
        deleteScript,
    });
    const {
        isOpen: isAttributeManagerOpen,
        activePanelId: activeAttributeManagerPanelId,
        selectedCharacterId: selectedAttributeManagerCharacterId,
        selectedCueId: selectedAttributeManagerCueId,
        tabs: attributeManagerTabs,
        open: openAttributeManagerModal,
        openWithPanel: openAttributeManagerModalWithPanel,
        openCharacter: openAttributeManagerCharacter,
        openCue: openAttributeManagerCue,
        close: closeAttributeManagerModal,
        selectPanel: selectAttributeManagerPanel,
    } = useAttributeManagerModalState();

    const {
        contextValue: charactersContextValue,
    } = useScriptCharactersContextValue({
        currentScriptId,
        scriptRepository,
        initialValue,
        resolvedScriptSettings,
        characterColorSaturation: resolvedScriptSettings.visual.characterColorSaturation,
        handleAutoSave,
    });
    const cueState = useScriptCuesState(currentScriptId, scriptRepository);
    const {
        getValue: getCueTitleDraft,
        persistValue: persistCueTitleDraft,
        setValue: setCueTitleDraft,
    } = useKeyedFieldDrafts<string>(currentScriptId);
    const placeState = useScriptPlacesState(currentScriptId, scriptRepository);
    const cueAttachmentsState = useCueAttachmentsState(currentScriptId, scriptRepository);
    const attributeManagerCharacters = useMemo<AttributeManagerCharacter[]>(() => {
        return charactersContextValue.confirmedCharacterRecords.map(character => ({
            id: character.id,
            name: liveCharacters.keyByCharacterId.get(character.id) ?? character.key,
            color: character.colorHex ?? null,
            outline: character.outline ?? null,
        })).sort((left, right) => left.name.localeCompare(right.name));
    }, [charactersContextValue.confirmedCharacterRecords, liveCharacters.keyByCharacterId]);
    const attributeManagerScenes = useMemo<AttributeManagerListItem[]>(() => {
        if (!isAttributeManagerOpen) {
            return [];
        }

        if (liveStructure.rows.length === 0) {
            const outline = buildScriptStructureOutline(initialValue?.content);
            let fallbackSceneNumber = 0;

            return outline.acts.flatMap(act => act.items.map(scene => {
                fallbackSceneNumber += 1;

                return {
                    id: scene.blockId,
                    number: `${fallbackSceneNumber}.`,
                    title: scene.title,
                    group: {
                        id: act.actId,
                        label: act.actName,
                    },
                };
            }));
        }

        let activeAct: {id: string, label: string} | undefined;
        let sceneNumber = 0;

        return liveStructure.rows.flatMap(row => {
            if (row.kind === 'act') {
                activeAct = {
                    id: row.blockId,
                    label: row.name,
                };

                return [];
            }

            sceneNumber += 1;

            return [
                {
                    id: row.blockId,
                    number: `${sceneNumber}.`,
                    title: row.title,
                    group: activeAct,
                },
            ];
        });
    }, [
        initialValue?.content,
        isAttributeManagerOpen,
        liveStructure.rows,
    ]);
    const {cues} = cueState;
    const attributeManagerCues = useMemo<AttributeManagerListItem[]>(() => {
        const items = liveStructure.rows.length > 0 || liveCues.length > 0
            ? buildAttributeManagerCueItemsFromLive(liveCues, liveStructure, cues)
            : buildAttributeManagerCueItems(initialValue, cues);

        return items
            .map(item => ({
                ...item,
                title: getCueTitleDraft(item.id, item.title),
            }));
    }, [
        cues,
        getCueTitleDraft,
        initialValue,
        liveCues,
        liveStructure,
    ]);
    const shortcutPrefix = isApplePlatform() ? 'Option' : 'Alt';
    const draftSaveError = scriptSettingsDraftError
        ?? titlePageDraftError
        ?? scriptTitleDraftError;
    const retryFailedDrafts = () => {
        void Promise.allSettled([
            scriptSettingsDraftError ? retryScriptSettings() : Promise.resolve(),
            titlePageDraftError ? retryTitlePage() : Promise.resolve(),
            scriptTitleDraftError ? retryScriptTitle() : Promise.resolve(),
        ]);
    };

    const contextValue = useMemo<ScriptSettingsModalContextValue>(() => ({
        resolvedScriptSettings,
        effectiveScriptSettingsDraft,
        titlePageDraft,
        scriptTitleDraft,
        cueState,
        openSettingsModal,
        openAttributeManagerModal,
        openAttributeManagerModalWithPanel,
        openAttributeManagerCharacter,
        openAttributeManagerCue,
    }), [
        cueState,
        effectiveScriptSettingsDraft,
        openAttributeManagerModal,
        openAttributeManagerModalWithPanel,
        openAttributeManagerCharacter,
        openAttributeManagerCue,
        openSettingsModal,
        resolvedScriptSettings,
        scriptTitleDraft,
        titlePageDraft,
    ]);

    return (
        <ScriptSettingsModalContext.Provider value={contextValue}>
            <ScriptCharactersProvider value={charactersContextValue}>
                {children}
                <ScriptSettingsModal
                    isOpen={isSettingsOpen}
                    title="Settings"
                    groups={groups}
                    activePanelId={activePanelId}
                    expandedItemIds={expandedItemIds}
                    onClose={handleCloseSettings}
                    onSelectPanel={handleSelectSettingsPanel}
                    onToggleExpand={toggleExpanded}
                >
                    <DraftSaveError
                        error={draftSaveError}
                        onRetry={retryFailedDrafts}
                    />
                    <ScriptEditorSettingsPanel
                        panelId={activePanelId}
                        resolvedScriptSettings={resolvedScriptSettings}
                        blockLabelByType={BLOCK_LABEL_BY_TYPE}
                        shortcutPrefix={shortcutPrefix}
                        elementsHandlers={{
                            onResetBlockSettings: resetBlockSettings,
                            onUpdateBlockSettings: updateBlockSettings,
                        }}
                        visualPreferencesHandlers={{onUpdateCharacterColorSaturation: updateCharacterColorSaturation}}
                        structureHandlers={{onUpdateStructureSettings: updateStructureSettings}}
                        pageLayoutHandlers={{onUpdatePageSettings: updatePageSettings}}
                        headerFooterHandlers={{onUpdateHeaderFooterSettings: updateHeaderFooterSettings}}
                        initialPagesHandlers={{onUpdateInitialPagesSettings: updateInitialPagesSettings}}
                        titlePageHandlers={{
                            titlePageSettings: titlePageDraft,
                            scriptTitle: scriptTitleDraft,
                            onUpdateScriptTitle: updateScriptTitle,
                            onUpdateTitlePage: updateTitlePage,
                        }}
                        dangerZoneHandlers={{
                            scriptTitle: scriptTitleDraft,
                            onDeleteScript: handleDeleteScript,
                        }}
                    />
                </ScriptSettingsModal>
                <AttributeManagerModal
                    isOpen={isAttributeManagerOpen}
                    tabs={attributeManagerTabs}
                    activeTabId={activeAttributeManagerPanelId}
                    onClose={closeAttributeManagerModal}
                    onSelectTab={selectAttributeManagerPanel}
                >
                    {activeAttributeManagerPanelId === ATTRIBUTE_MANAGER_PANEL_STRUCTURE ? (
                        <AttributeManagerListPanel
                            items={attributeManagerScenes}
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
                    {activeAttributeManagerPanelId === ATTRIBUTE_MANAGER_PANEL_CHARACTERS ? (
                        <AttributeManagerCharactersPanel
                            characters={attributeManagerCharacters}
                            initialSelectedCharacterId={selectedAttributeManagerCharacterId}
                            isLoading={charactersContextValue.isCharactersLoading}
                            characterColorSaturation={resolvedScriptSettings.visual.characterColorSaturation}
                            deletingCharacterIds={charactersContextValue.deletingCharacterIds}
                            colorUpdatingCharacterIds={charactersContextValue.colorUpdatingCharacterIds}
                            onSetCharacterColor={charactersContextValue.handleSetCharacterColor}
                            onSetCharacterOutline={charactersContextValue.handleSetCharacterOutline}
                            onDeleteCharacter={charactersContextValue.handleDeleteCharacter}
                            onCreateCharacter={charactersContextValue.handleConfirmCharacter}
                        />
                    ) : null}
                    {activeAttributeManagerPanelId === ATTRIBUTE_MANAGER_PANEL_CUES ? (
                        <AttributeManagerListPanel
                            items={attributeManagerCues}
                            initialSelectedItemId={selectedAttributeManagerCueId}
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
                    {activeAttributeManagerPanelId === ATTRIBUTE_MANAGER_PANEL_PLACES ? (
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
            </ScriptCharactersProvider>
        </ScriptSettingsModalContext.Provider>
    );
};
