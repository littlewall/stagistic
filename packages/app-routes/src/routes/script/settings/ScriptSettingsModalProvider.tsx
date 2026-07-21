import {
    useScriptActions,
    useScriptRepository,
} from '@stagistic/app-core';
import {
    type EditorSettings,
    type EditorSettingsOverride,
    type TitlePageSettings,
} from '@stagistic/script';
import {isApplePlatform} from '@stagistic/shared';
import {
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
    type AttributeManagerPanelId,
} from '../attributes/attributeManagerMenu';
import {useAttributeManagerModalState} from '../attributes/useAttributeManagerModalState';
import {useMusicAttachmentsState} from '../attributes/useMusicAttachmentsState';
import {useScriptPlacesState} from '../attributes/useScriptPlacesState';
import {useScriptMusicState} from '../editor/music';
import {ScriptEditorSettingsPanel} from '../editor/settings';
import {ScriptCharactersProvider} from '../ScriptCharactersContext';
import {useScriptWorkspace} from '../ScriptWorkspaceContext';
import {useScriptCharactersContextValue} from '../useScriptCharactersContextValue';
import {useScriptEditorSettingsDraft} from '../useScriptEditorSettingsDraft';
import {useScriptEditorSettingsModal} from '../useScriptEditorSettingsModal';
import {useScriptTitleDraft} from '../useScriptTitleDraft';
import {useTitlePageDraft} from '../useTitlePageDraft';
import {DraftSaveError} from './DraftSaveError';
import {ScriptAttributeManagerModal} from './ScriptAttributeManagerModal';
import {SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS} from './settingsMenu';
import {useAttributeManagerItems} from './useAttributeManagerItems';

const BLOCK_LABEL_BY_TYPE = new Map(
    SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS.map(item => [item.blockType, item.label] as const),
);

interface ScriptSettingsModalContextValue {
    resolvedScriptSettings: EditorSettings,
    effectiveScriptSettingsDraft: EditorSettingsOverride,
    isEditorPresentationHydrated: boolean,
    titlePageDraft: TitlePageSettings,
    scriptTitleDraft: string,
    musicState: ReturnType<typeof useScriptMusicState>,
    openSettingsModal: () => void,
    openAttributeManagerModal: () => void,
    openAttributeManagerModalWithPanel: (panelId: AttributeManagerPanelId) => void,
    openAttributeManagerCharacter: (characterId: string) => void,
    openAttributeManagerMusic: (musicId: string) => void,
}

const ScriptSettingsModalContext = createContext<ScriptSettingsModalContextValue | null>(null);

export const useScriptSettingsModal = (): ScriptSettingsModalContextValue => {
    const context = useContext(ScriptSettingsModalContext);

    if (!context) {
        throw new Error('useScriptSettingsModal must be used inside ScriptSettingsModalProvider');
    }

    return context;
};

export const ScriptSettingsModalProvider = ({children}: {children: ReactNode}) => {
    const navigate = useNavigate();
    const scriptRepository = useScriptRepository();
    const {deleteScript, renameScriptTitle} = useScriptActions();
    const [searchParams, setSearchParams] = useSearchParams();
    const {
        currentScript,
        currentScriptId,
        characterCatalog,
        musicCatalog,
        initialValue,
        handleAutoSave,
    } = useScriptWorkspace();
    const {
        effectiveScriptSettingsDraft,
        isScriptSettingsHydrated,
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
        isTitlePageHydrated,
        updateTitlePage,
        titlePageDraftError,
        retryTitlePage,
    } = useTitlePageDraft({
        currentScriptId,
        repository: scriptRepository,
    });
    const {
        scriptTitleDraft,
        isScriptTitleHydrated,
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
        selectedMusicId: selectedAttributeManagerMusicId,
        tabs: attributeManagerTabs,
        open: openAttributeManagerModal,
        openWithPanel: openAttributeManagerModalWithPanel,
        openCharacter: openAttributeManagerCharacter,
        openMusic: openAttributeManagerMusic,
        close: closeAttributeManagerModal,
        selectPanel: selectAttributeManagerPanel,
    } = useAttributeManagerModalState();

    const {
        contextValue: charactersContextValue,
    } = useScriptCharactersContextValue({
        currentScriptId,
        characterCatalog,
        initialValue,
        resolvedScriptSettings,
        characterColorSaturation: resolvedScriptSettings.visual.characterColorSaturation,
        handleAutoSave,
    });
    const musicState = useScriptMusicState(currentScriptId, musicCatalog);
    const {
        getValue: getMusicTitleDraft,
        persistValue: persistMusicTitleDraft,
        setValue: setMusicTitleDraft,
    } = useKeyedFieldDrafts<string>(currentScriptId);
    const placeState = useScriptPlacesState(currentScriptId, scriptRepository);
    const musicAttachmentsState = useMusicAttachmentsState(currentScriptId, scriptRepository);
    const {music} = musicState;
    const {
        characterItems: attributeManagerCharacters,
        sceneItems: attributeManagerScenes,
        musicItems: attributeManagerMusic,
    } = useAttributeManagerItems({
        isOpen: isAttributeManagerOpen,
        initialValue,
        characters: charactersContextValue,
        music,
        getMusicTitleDraft,
    });
    const shortcutPrefix = isApplePlatform() ? 'Option' : 'Alt';
    const draftSaveError = scriptSettingsDraftError
        ?? titlePageDraftError
        ?? scriptTitleDraftError;
    const isEditorPresentationHydrated = isScriptSettingsHydrated
        && isTitlePageHydrated
        && isScriptTitleHydrated;
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
        isEditorPresentationHydrated,
        titlePageDraft,
        scriptTitleDraft,
        musicState,
        openSettingsModal,
        openAttributeManagerModal,
        openAttributeManagerModalWithPanel,
        openAttributeManagerCharacter,
        openAttributeManagerMusic,
    }), [
        musicState,
        effectiveScriptSettingsDraft,
        isEditorPresentationHydrated,
        openAttributeManagerModal,
        openAttributeManagerModalWithPanel,
        openAttributeManagerCharacter,
        openAttributeManagerMusic,
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
                <ScriptAttributeManagerModal
                    currentScriptId={currentScriptId}
                    isOpen={isAttributeManagerOpen}
                    tabs={attributeManagerTabs}
                    activePanelId={activeAttributeManagerPanelId}
                    selectedCharacterId={selectedAttributeManagerCharacterId}
                    selectedMusicId={selectedAttributeManagerMusicId}
                    onClose={closeAttributeManagerModal}
                    onSelectPanel={selectAttributeManagerPanel}
                    characters={charactersContextValue}
                    characterItems={attributeManagerCharacters}
                    characterColorSaturation={resolvedScriptSettings.visual.characterColorSaturation}
                    sceneItems={attributeManagerScenes}
                    placeState={placeState}
                    musicState={musicState}
                    musicItems={attributeManagerMusic}
                    musicAttachmentsState={musicAttachmentsState}
                    setMusicTitleDraft={setMusicTitleDraft}
                    persistMusicTitleDraft={persistMusicTitleDraft}
                />
            </ScriptCharactersProvider>
        </ScriptSettingsModalContext.Provider>
    );
};
