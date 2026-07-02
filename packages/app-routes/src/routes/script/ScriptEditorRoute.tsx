import {
    useScriptRepository,
    useScripts,
} from '@stagistic/app-core';
import {
    incrementRouteRenderCount,
    ScriptEditor,
} from '@stagistic/editor';
import {isApplePlatform} from '@stagistic/shared';
import {
    AppLayout,
    LoaderOverlay,
    ScriptSettingsModal,
} from '@stagistic/ui';
import {useMemo} from 'react';
import {
    useNavigate,
    useParams,
    useSearchParams,
} from 'react-router-dom';

import {AppHeader, ScriptEditorAppHeader} from '../../layout/AppHeader';
import {ScriptCharactersSidebar} from './editor/characters/ScriptCharactersSidebar';
import {ScriptEditorSettingsPanel} from './editor/settings';
import {resolveDraftDate} from './editor/settings/draftDate';
import {
    type SidebarPanel,
    useEditorSidebars,
} from './editor/sidebar';
import {
    ScriptStructureSidebar,
    StructureSidebarContextActions,
} from './editor/structure';
import {ScriptCharactersProvider} from './ScriptCharactersContext';
import {ScriptSessionProvider} from './ScriptSessionContext';
import {SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS} from './settings/settingsMenu';
import {useScriptCharactersContextValue} from './useScriptCharactersContextValue';
import {useScriptEditorController} from './useScriptEditorController';
import {useScriptEditorHeaderActions} from './useScriptEditorHeaderActions';
import {useScriptEditorSettingsDraft} from './useScriptEditorSettingsDraft';
import {useScriptEditorSettingsModal} from './useScriptEditorSettingsModal';
import {useScriptTitleDraft} from './useScriptTitleDraft';
import {useTitlePageDraft} from './useTitlePageDraft';

const AUTOSAVE_DELAY_MS = 1500;
const SIDEBAR_WIDTH = 'calc(280px * var(--size-scale))';
const BLOCK_LABEL_BY_TYPE = new Map(
    SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS.map(item => [item.blockType, item.label] as const),
);

export const ScriptEditorRoute = () => {
    incrementRouteRenderCount();

    const navigate = useNavigate();
    const {scriptId} = useParams();
    const scriptRepository = useScriptRepository();
    const {deleteScript, renameScript} = useScripts();
    const [searchParams, setSearchParams] = useSearchParams();
    const {
        currentScript,
        currentScriptId,
        recentScripts,
        initialValue,
        initialIndexSnapshot,
        scriptSettingsOverride,
        storageError,
        shouldAutoFocus,
        saveIndicator,
        editorLoadState,
        handleAutoSave,
        handleManualSave,
        handleSaveScriptSettingsOverride,
    } = useScriptEditorController(scriptId);
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
        renameScript,
    });
    const displayedCurrentScript = useMemo(
        () => currentScript ? {...currentScript, name: scriptTitleDraft} : null,
        [currentScript, scriptTitleDraft],
    );
    const shortcutPrefix = isApplePlatform() ? 'Option' : 'Alt';

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
        getEditorValue,
        editorOverrideValue,
        normalizedConfirmedCharacterRecords,
        handleResolvedEditorValueChange,
        contextValue: charactersContextValue,
    } = useScriptCharactersContextValue({
        currentScriptId,
        scriptRepository,
        initialValue,
        resolvedScriptSettings,
        characterColorSaturation: resolvedScriptSettings.visual.characterColorSaturation,
        handleAutoSave,
    });

    const {handleMenuAction} = useScriptEditorHeaderActions({
        navigate,
        currentScript: displayedCurrentScript,
        openSettingsModal,
        getEditorValue,
        titlePage: titlePageDraft,
    });

    const sessionContextValue = useMemo(() => ({
        currentScriptId,
        scriptRepository,
        resolvedScriptSettings,
        indexSnapshot: initialIndexSnapshot ?? null,
        handleAutoSave,
    }), [
        currentScriptId,
        handleAutoSave,
        initialIndexSnapshot,
        resolvedScriptSettings,
        scriptRepository,
    ]);

    const sidebarPanels = useMemo<readonly SidebarPanel[]>(() => [
        {
            id: 'structure',
            label: 'Structure',
            renderContent: () => <ScriptStructureSidebar />,
            renderContextActions: () => <StructureSidebarContextActions />,
        }, {
            id: 'characters',
            label: 'Characters',
            renderContent: () => <ScriptCharactersSidebar />,
        },
    ], []);
    const {
        leftSidebarToggle,
        rightSidebarToggle,
        leftSidebarHeader,
        rightSidebarHeader,
        leftSidebar,
        rightSidebar,
    } = useEditorSidebars({
        panels: sidebarPanels,
        defaultLeftPanelId: 'structure',
        defaultRightPanelId: 'characters',
    });
    const resolvedEditorInitialValue = editorOverrideValue ?? initialValue;

    const showEditorLoader = editorLoadState.isLoading || !initialValue;

    if (showEditorLoader) {
        return (
            <LoaderOverlay
                title="Preparing editor"
                subtitle="Loading your script"
                progress={editorLoadState.progress}
                statusText={editorLoadState.statusText}
                hint={storageError ?? 'Please wait while we set up the editor.'}
            />
        );
    }

    if (!resolvedEditorInitialValue) {
        return null;
    }

    return (
        <ScriptSessionProvider value={sessionContextValue}>
            <ScriptCharactersProvider value={charactersContextValue}>
                <AppLayout
                    header={(
                        displayedCurrentScript ? (
                            <ScriptEditorAppHeader
                                currentScript={displayedCurrentScript}
                                recentScripts={recentScripts}
                                scriptSyncState={saveIndicator}
                                onMenuAction={handleMenuAction}
                            />
                        ) : (
                            <AppHeader onMenuAction={handleMenuAction} />
                        )
                    )}
                >
                    {storageError ? (
                        <div role="alert" style={{padding: '12px 20px'}}>
                            {storageError}
                        </div>
                    ) : null}
                    <ScriptEditor
                        key={currentScript?.id ?? 'editor'}
                        document={{
                            initialValue: resolvedEditorInitialValue,
                            persistentCharacters: normalizedConfirmedCharacterRecords,
                            scriptTitle: scriptTitleDraft,
                            draftDate: resolveDraftDate(titlePageDraft),
                        }}
                        settings={{
                            scriptSettings: effectiveScriptSettingsDraft,
                        }}
                        save={{
                            onAutoSave: handleAutoSave,
                            onManualSave: handleManualSave,
                            autoSaveDelayMs: AUTOSAVE_DELAY_MS,
                        }}
                        layout={{
                            autoFocus: shouldAutoFocus,
                            leftSidebarToggle,
                            rightSidebarToggle,
                            leftSidebarHeader,
                            rightSidebarHeader,
                            sidebarWidth: SIDEBAR_WIDTH,
                        }}
                        callbacks={{
                            onValueChange: handleResolvedEditorValueChange,
                        }}
                    >
                        <ScriptEditor.LeftSidebar>
                            {leftSidebar}
                        </ScriptEditor.LeftSidebar>
                        <ScriptEditor.RightSidebar>
                            {rightSidebar}
                        </ScriptEditor.RightSidebar>
                    </ScriptEditor>
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
                </AppLayout>
            </ScriptCharactersProvider>
        </ScriptSessionProvider>
    );
};
