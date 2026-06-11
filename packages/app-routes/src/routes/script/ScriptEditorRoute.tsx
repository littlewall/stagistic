import {
    useScriptRepository,
    useScripts,
} from '@stagistic/app-core';
import {
    FountainEditor,
    incrementRouteRenderCount,
} from '@stagistic/editor';
import {isApplePlatform} from '@stagistic/shared';
import {
    AppLayout,
    LoaderOverlay,
    ScriptSettingsModal,
} from '@stagistic/ui';
import {
    useCallback,
    useMemo,
} from 'react';
import {
    useNavigate,
    useParams,
    useSearchParams,
} from 'react-router-dom';

import {AppHeader, ScriptEditorAppHeader} from '../../layout/AppHeader';
import {ScriptCharactersSidebar} from './editor/characters/ScriptCharactersSidebar';
import {useScriptEditorCharacters} from './editor/characters/useScriptEditorCharacters';
import {ScriptEditorSettingsPanel} from './editor/settings';
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
import {
    SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS,
    type ScriptSettingsPanelId,
    SETTINGS_MODAL_QUERY_KEY,
} from './settings/settingsMenu';
import {useScriptSettingsModalQuerySync} from './settings/useScriptSettingsModalQuerySync';
import {useScriptSettingsModalState} from './settings/useScriptSettingsModalState';
import {useScriptEditorController} from './useScriptEditorController';
import {useScriptEditorHeaderActions} from './useScriptEditorHeaderActions';
import {useScriptEditorSettingsDraft} from './useScriptEditorSettingsDraft';
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
    const {deleteScript} = useScripts();
    const [searchParams, setSearchParams] = useSearchParams();
    const {
        isOpen: isSettingsOpen,
        activePanelId,
        expandedItemIds,
        groups,
        open: openSettingsModal,
        close: closeSettingsModal,
        selectPanel,
        toggleExpanded,
    } = useScriptSettingsModalState();
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
        scriptSettingsDraft,
        resolvedScriptSettings,
        updateBlockSettings,
        updateCharacterColorSaturation,
        updateStructureSettings,
        updatePageSettings,
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
    const shortcutPrefix = isApplePlatform() ? 'Cmd' : 'Ctrl';

    const {
        editorOverrideValue,
        confirmedCharacterRecords,
        normalizedConfirmedCharacterRecords,
        pendingCharacterKeys,
        deletingCharacterIds,
        renamingCharacterIds,
        renamingCharacterKeys,
        colorUpdatingCharacterIds,
        genderUpdatingCharacterIds,
        characterGenderOptions,
        isCharactersLoading,
        handleEditorValueChange,
        normalizeCharacterNameForInlineInput,
        handleConfirmCharacter,
        handleDeleteCharacter,
        handleRenameCharacterPreview,
        handleRenameCharacter,
        handleSetCharacterColor,
        handleSetCharacterGender,
        handleUpsertCharacterGender,
    } = useScriptEditorCharacters({
        currentScriptId,
        scriptRepository,
        initialValue,
        resolvedScriptSettings,
        characterColorSaturation: resolvedScriptSettings.visual.characterColorSaturation,
        handleAutoSave,
    });
    const handleResolvedEditorValueChange = useCallback((
        value: Parameters<typeof handleEditorValueChange>[0],
        meta?: Parameters<typeof handleEditorValueChange>[1],
    ) => {
        handleEditorValueChange(value, meta);
    }, [handleEditorValueChange]);
    const {handleMenuAction} = useScriptEditorHeaderActions({
        navigate,
        currentScript,
        openSettingsModal,
    });

    const handleSelectSettingsPanel = useCallback((panelId: string) => {
        selectPanel(panelId as ScriptSettingsPanelId);
    }, [selectPanel]);
    const handleDeleteScript = useCallback(async () => {
        if (!currentScriptId) {
            return;
        }

        await deleteScript(currentScriptId);
        void navigate('/');
    }, [
        currentScriptId,
        deleteScript,
        navigate,
    ]);
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

    const charactersContextValue = useMemo(() => ({
        editorOverrideValue,
        normalizedConfirmedCharacterRecords,
        handleEditorValueChange,
        confirmedCharacterRecords,
        pendingCharacterKeys,
        deletingCharacterIds,
        renamingCharacterIds,
        renamingCharacterKeys,
        colorUpdatingCharacterIds,
        genderUpdatingCharacterIds,
        characterGenderOptions,
        isCharactersLoading,
        normalizeCharacterNameForInlineInput,
        handleConfirmCharacter,
        handleDeleteCharacter,
        handleRenameCharacterPreview,
        handleRenameCharacter,
        handleSetCharacterColor,
        handleSetCharacterGender,
        handleUpsertCharacterGender,
    }), [
        characterGenderOptions,
        colorUpdatingCharacterIds,
        confirmedCharacterRecords,
        deletingCharacterIds,
        editorOverrideValue,
        genderUpdatingCharacterIds,
        handleConfirmCharacter,
        handleDeleteCharacter,
        handleEditorValueChange,
        handleRenameCharacter,
        handleRenameCharacterPreview,
        handleSetCharacterColor,
        handleSetCharacterGender,
        handleUpsertCharacterGender,
        isCharactersLoading,
        normalizeCharacterNameForInlineInput,
        normalizedConfirmedCharacterRecords,
        pendingCharacterKeys,
        renamingCharacterIds,
        renamingCharacterKeys,
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
    const handleCloseSettings = useScriptSettingsModalQuerySync({
        queryKey: SETTINGS_MODAL_QUERY_KEY,
        searchParams,
        setSearchParams,
        openSettingsModal,
        closeSettingsModal,
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
                        currentScript ? (
                            <ScriptEditorAppHeader
                                currentScript={currentScript}
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
                    <FountainEditor
                        key={currentScript?.id ?? 'editor'}
                        document={{
                            initialValue: resolvedEditorInitialValue,
                            persistentCharacters: normalizedConfirmedCharacterRecords,
                        }}
                        settings={{
                            scriptSettings: scriptSettingsDraft,
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
                        <FountainEditor.LeftSidebar>
                            {leftSidebar}
                        </FountainEditor.LeftSidebar>
                        <FountainEditor.RightSidebar>
                            {rightSidebar}
                        </FountainEditor.RightSidebar>
                    </FountainEditor>
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
                            elementsHandlers={{onUpdateBlockSettings: updateBlockSettings}}
                            visualPreferencesHandlers={{onUpdateCharacterColorSaturation: updateCharacterColorSaturation}}
                            structureHandlers={{onUpdateStructureSettings: updateStructureSettings}}
                            pageLayoutHandlers={{onUpdatePageSettings: updatePageSettings}}
                            titlePageHandlers={{
                                titlePageSettings: titlePageDraft,
                                scriptTitle: currentScript?.name ?? '',
                                onUpdateTitlePage: updateTitlePage,
                            }}
                            dangerZoneHandlers={{
                                scriptTitle: currentScript?.name ?? '',
                                onDeleteScript: handleDeleteScript,
                            }}
                        />
                    </ScriptSettingsModal>
                </AppLayout>
            </ScriptCharactersProvider>
        </ScriptSessionProvider>
    );
};
