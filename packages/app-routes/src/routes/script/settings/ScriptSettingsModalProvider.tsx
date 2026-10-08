import {useScriptActions, useScriptRepository} from '@stagistic/app-core';
import {isApplePlatform} from '@stagistic/shared';
import {ScriptSettingsModal, useKeyedFieldDrafts} from '@stagistic/ui';
import {type ReactNode, useMemo} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';

import {deleteAttributeManagerMusic} from '../attribute-manager/deleteAttributeManagerMusic';
import {deleteAttributeManagerScene} from '../attribute-manager/deleteAttributeManagerScene';
import {ScriptAttributeManagerModal} from '../attribute-manager/ScriptAttributeManagerModal';
import {useAttributeManagerItems} from '../attribute-manager/useAttributeManagerItems';
import {useAttributeManagerModalState} from '../attribute-manager/useAttributeManagerModalState';
import {useMusicAttachmentsState} from '../attribute-manager/useMusicAttachmentsState';
import {useScriptPlacesState} from '../attribute-manager/useScriptPlacesState';
import {DraftSaveError} from '../drafts/DraftSaveError';
import {useScriptEditorSettingsDraft} from '../drafts/useScriptEditorSettingsDraft';
import {useScriptTitleDraft} from '../drafts/useScriptTitleDraft';
import {useTitlePageDraft} from '../drafts/useTitlePageDraft';
import {useScriptMusicState} from '../editor/music/useScriptMusicState';
import {ScriptCharactersProvider} from '../workspace/ScriptCharactersContext';
import {useScriptWorkspace} from '../workspace/ScriptWorkspaceContext';
import {useScriptCharactersContextValue} from '../workspace/useScriptCharactersContextValue';
import {ScriptEditorSettingsPanel} from './panels';
import {ScriptSettingsModalContext, type ScriptSettingsModalContextValue} from './ScriptSettingsModalContext';
import {SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS} from './settingsMenu';
import {useScriptEditorSettingsModal} from './useScriptEditorSettingsModal';

const BLOCK_LABEL_BY_TYPE = new Map(SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS.map(item => [item.blockType, item.label] as const));

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
        replica,
    } = useScriptWorkspace();
    const {
        effectiveScriptSettingsDraft,
        isScriptSettingsHydrated,
        resolvedScriptSettings,
        updateBlockSettings,
        resetBlockSettings,
        updateCharacterDecoration,
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
        selectedGroupId: selectedAttributeManagerGroupId,
        selectedMusicId: selectedAttributeManagerMusicId,
        initialWorkspaceId: initialAttributeManagerWorkspaceId,
        tabs: attributeManagerTabs,
        open: openAttributeManagerModal,
        openWithPanel: openAttributeManagerModalWithPanel,
        openCharacter: openAttributeManagerCharacter,
        openGroup: openAttributeManagerGroup,
        openMusic: openAttributeManagerMusic,
        close: closeAttributeManagerModal,
        selectPanel: selectAttributeManagerPanel,
    } = useAttributeManagerModalState();

    const {
        applyDocumentChange,
        contextValue: charactersContextValue,
        getEditorValue,
    } = useScriptCharactersContextValue({
        currentScriptId,
        characterCatalog,
        initialValue,
        resolvedScriptSettings,
        handleAutoSave,
        replica,
    });
    const musicState = useScriptMusicState(currentScriptId, musicCatalog);
    const {
        getValue: getMusicTitleDraft,
        persistValue: persistMusicTitleDraft,
        setValue: setMusicTitleDraft,
    } = useKeyedFieldDrafts<string>(currentScriptId);
    const placeState = useScriptPlacesState(currentScriptId, scriptRepository);
    const musicAttachmentsState = useMusicAttachmentsState(currentScriptId, scriptRepository);
    const {
        characterItems: attributeManagerCharacters,
        groupItems: attributeManagerGroups,
        sceneItems: attributeManagerScenes,
        musicItems: attributeManagerMusic,
    } = useAttributeManagerItems({
        isOpen: isAttributeManagerOpen,
        initialValue,
        characters: charactersContextValue,
        music: musicState.music,
        getMusicTitleDraft,
    });
    const shortcutPrefix = isApplePlatform() ? 'Control' : 'Alt';
    const draftSaveError = scriptSettingsDraftError ?? titlePageDraftError ?? scriptTitleDraftError;
    const isEditorPresentationHydrated = isScriptSettingsHydrated && isTitlePageHydrated && isScriptTitleHydrated;
    const retryFailedDrafts = () => {
        void Promise.allSettled([
            scriptSettingsDraftError ? retryScriptSettings() : Promise.resolve(),
            titlePageDraftError ? retryTitlePage() : Promise.resolve(),
            scriptTitleDraftError ? retryScriptTitle() : Promise.resolve(),
        ]);
    };
    const handleDeleteMusic = (musicId: string) => deleteAttributeManagerMusic({
        document: getEditorValue(),
        musicId,
        applyDocumentChange,
        deleteMusic: musicState.deleteMusic,
    });
    /*
     * Scene items are built in document order, so the first entry is the
     * document-first scene heading — the one that can never be deleted.
     */
    const firstSceneHeadingBlockId = attributeManagerScenes[0]?.id ?? null;
    const handleDeleteScene = (sceneHeadingBlockId: string) => deleteAttributeManagerScene({
        document: getEditorValue(),
        sceneHeadingBlockId,
        applyDocumentChange,
    });

    const contextValue = useMemo<ScriptSettingsModalContextValue>(
        () => ({
            resolvedScriptSettings,
            effectiveScriptSettingsDraft,
            isEditorPresentationHydrated,
            titlePageDraft,
            scriptTitleDraft,
            updateScriptTitle,
            musicState,
            musicAttachmentsState,
            openSettingsModal,
            openAttributeManagerModal,
            openAttributeManagerModalWithPanel,
            openAttributeManagerCharacter,
            openAttributeManagerGroup,
            openAttributeManagerMusic,
        }),
        [
            musicState,
            musicAttachmentsState,
            effectiveScriptSettingsDraft,
            isEditorPresentationHydrated,
            openAttributeManagerModal,
            openAttributeManagerModalWithPanel,
            openAttributeManagerCharacter,
            openAttributeManagerGroup,
            openAttributeManagerMusic,
            openSettingsModal,
            resolvedScriptSettings,
            scriptTitleDraft,
            titlePageDraft,
            updateScriptTitle,
        ],
    );

    return (
        <ScriptSettingsModalContext.Provider value={contextValue}>
            <ScriptCharactersProvider value={charactersContextValue}>
                {children}
                <ScriptSettingsModal
                    isOpen={isSettingsOpen}
                    title="Script settings"
                    groups={groups}
                    activePanelId={activePanelId}
                    expandedItemIds={expandedItemIds}
                    onClose={handleCloseSettings}
                    onSelectPanel={handleSelectSettingsPanel}
                    onToggleExpand={toggleExpanded}
                >
                    <DraftSaveError error={draftSaveError} onRetry={retryFailedDrafts} />
                    <ScriptEditorSettingsPanel
                        panelId={activePanelId}
                        resolvedScriptSettings={resolvedScriptSettings}
                        settingsOverride={effectiveScriptSettingsDraft}
                        blockLabelByType={BLOCK_LABEL_BY_TYPE}
                        shortcutPrefix={shortcutPrefix}
                        elementsHandlers={{
                            onResetBlockSettings: resetBlockSettings,
                            onUpdateBlockSettings: updateBlockSettings,
                        }}
                        visualPreferencesHandlers={{onUpdateCharacterDecoration: updateCharacterDecoration}}
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
                    selectedGroupId={selectedAttributeManagerGroupId}
                    selectedMusicId={selectedAttributeManagerMusicId}
                    initialWorkspaceId={initialAttributeManagerWorkspaceId}
                    onClose={closeAttributeManagerModal}
                    onSelectPanel={selectAttributeManagerPanel}
                    characters={charactersContextValue}
                    characterItems={attributeManagerCharacters}
                    groupItems={attributeManagerGroups}
                    sceneItems={attributeManagerScenes}
                    firstSceneHeadingBlockId={firstSceneHeadingBlockId}
                    onDeleteScene={handleDeleteScene}
                    placeState={placeState}
                    musicState={musicState}
                    musicItems={attributeManagerMusic}
                    musicAttachmentsState={musicAttachmentsState}
                    setMusicTitleDraft={setMusicTitleDraft}
                    persistMusicTitleDraft={persistMusicTitleDraft}
                    onDeleteMusic={handleDeleteMusic}
                />
            </ScriptCharactersProvider>
        </ScriptSettingsModalContext.Provider>
    );
};
