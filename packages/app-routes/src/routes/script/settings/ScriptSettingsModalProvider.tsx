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
import {DraftSaveError} from './DraftSaveError';
import {ScriptAttributeManagerModal} from './ScriptAttributeManagerModal';
import {SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS} from './settingsMenu';
import {useAttributeManagerItems} from './useAttributeManagerItems';

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
    const {deleteScript, renameScriptTitle} = useScriptActions();
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
    const {cues} = cueState;
    const {
        characterItems: attributeManagerCharacters,
        sceneItems: attributeManagerScenes,
        cueItems: attributeManagerCues,
    } = useAttributeManagerItems({
        isOpen: isAttributeManagerOpen,
        initialValue,
        characters: charactersContextValue,
        cues,
        getCueTitleDraft,
    });
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
                <ScriptAttributeManagerModal
                    currentScriptId={currentScriptId}
                    isOpen={isAttributeManagerOpen}
                    tabs={attributeManagerTabs}
                    activePanelId={activeAttributeManagerPanelId}
                    selectedCharacterId={selectedAttributeManagerCharacterId}
                    selectedCueId={selectedAttributeManagerCueId}
                    onClose={closeAttributeManagerModal}
                    onSelectPanel={selectAttributeManagerPanel}
                    characters={charactersContextValue}
                    characterItems={attributeManagerCharacters}
                    characterColorSaturation={resolvedScriptSettings.visual.characterColorSaturation}
                    sceneItems={attributeManagerScenes}
                    placeState={placeState}
                    cueState={cueState}
                    cueItems={attributeManagerCues}
                    cueAttachmentsState={cueAttachmentsState}
                    setCueTitleDraft={setCueTitleDraft}
                    persistCueTitleDraft={persistCueTitleDraft}
                />
            </ScriptCharactersProvider>
        </ScriptSettingsModalContext.Provider>
    );
};
