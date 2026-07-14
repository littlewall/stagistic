import {
    useScriptRepository,
    useScripts,
} from '@stagistic/app-core';
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
    ScriptSettingsModal,
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
import {useAttributeManagerModalState} from '../attributes/useAttributeManagerModalState';
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
import {buildAttributeManagerCueItems} from './attributeManagerCueItems';
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
    const navigate = useNavigate();
    const scriptRepository = useScriptRepository();
    const {deleteScript, renameScriptTitle} = useScripts();
    const [searchParams, setSearchParams] = useSearchParams();
    const {
        currentScript,
        currentScriptId,
        initialValue,
        scriptSettingsOverride,
        handleAutoSave,
        handleSaveScriptSettingsOverride,
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
    } = useScriptEditorSettingsDraft({
        state: {
            currentScriptId,
            scriptSettingsOverride,
        },
        requests: {
            handleSaveScriptSettingsOverride,
        },
    });
    const {
        titlePageDraft,
        updateTitlePage,
    } = useTitlePageDraft({
        currentScriptId,
        repository: scriptRepository,
    });
    const {
        scriptTitleDraft,
        updateScriptTitle,
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
    const placeState = useScriptPlacesState(currentScriptId, scriptRepository);
    const attributeManagerCharacters = useMemo<AttributeManagerCharacter[]>(() => {
        return charactersContextValue.confirmedCharacterRecords.map(character => ({
            id: character.id,
            name: character.key,
            color: character.colorHex ?? null,
            outline: character.outline ?? null,
        })).sort((left, right) => left.name.localeCompare(right.name));
    }, [charactersContextValue.confirmedCharacterRecords]);
    const {getEditorValue} = charactersContextValue;
    const attributeManagerScenes = useMemo<AttributeManagerListItem[]>(() => {
        if (!isAttributeManagerOpen) {
            return [];
        }

        const outline = buildScriptStructureOutline(getEditorValue()?.content);

        return outline.acts.flatMap(act => act.items).map((scene, index) => ({
            id: scene.blockId,
            number: `${index + 1}.`,
            title: scene.title,
        }));
    }, [getEditorValue, isAttributeManagerOpen]);
    const {cues} = cueState;
    const attributeManagerCues = useMemo<AttributeManagerListItem[]>(() => {
        return buildAttributeManagerCueItems(getEditorValue(), cues);
    }, [cues, getEditorValue]);
    const shortcutPrefix = isApplePlatform() ? 'Option' : 'Alt';

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
                        />
                    ) : null}
                    {activeAttributeManagerPanelId === ATTRIBUTE_MANAGER_PANEL_PLACES ? (
                        <AttributeManagerPlacesPanel
                            places={placeState.places}
                            isLoading={placeState.isLoading}
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
