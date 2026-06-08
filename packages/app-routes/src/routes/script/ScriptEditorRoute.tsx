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
    AppHeader,
    AppLayout,
    LoaderOverlay,
    ScriptEditorAppHeader,
    ScriptSettingsModal,
} from '@stagistic/ui';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
} from 'react';
import {
    useNavigate,
    useParams,
    useSearchParams,
} from 'react-router-dom';

import {useGlobalModals} from '../../global-modals/GlobalModalsProvider';
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
import {useStructureSidebarController} from './editor/structure/useStructureSidebarController';
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
        openNewScript, openImportScript, isImportLoading,
    } = useGlobalModals();
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
    const structureSourceValue = editorOverrideValue ?? initialValue;
    const {
        insertActRequest,
        renameActRequest,
        deleteActRequest,
        moveSceneRequest,
        actNamePreviewById,
        handleSidebarRenameAct,
        handleActNamePreview,
        handleSidebarDeleteAct,
        handleSidebarInsertAct,
        handleSidebarReorderScene,
        handleActiveBlockChange,
    } = useStructureSidebarController({
        currentScriptId,
        scriptRepository,
        sourceValue: structureSourceValue,
    });
    const sourceIndexForSidebars = initialIndexSnapshot ?? null;
    const lastResolvedActiveBlockIdRef = useRef<string | null | undefined>(undefined);
    const handleResolvedEditorValueChange = useCallback((
        value: Parameters<typeof handleEditorValueChange>[0],
        meta?: Parameters<typeof handleEditorValueChange>[1],
    ) => {
        handleEditorValueChange(value, meta);
    }, [handleEditorValueChange]);
    const handleResolvedActiveBlockChange = useCallback((blockId: string | null) => {
        if (lastResolvedActiveBlockIdRef.current === blockId) {
            return;
        }

        lastResolvedActiveBlockIdRef.current = blockId;
        handleActiveBlockChange(blockId);
    }, [handleActiveBlockChange]);
    const {
        handleSelectScript,
        handleHome,
        handleNewScript,
        handleMenuAction,
    } = useScriptEditorHeaderActions({
        navigate,
        currentScript,
        openSettingsModal,
        openNewScript,
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
    const structureSidebarProps = useMemo(() => ({
        data: {
            indexSnapshot: sourceIndexForSidebars,
            actNamePreviewById,
        },
        actions: {
            onRenameAct: handleSidebarRenameAct,
            onActNamePreview: handleActNamePreview,
            onDeleteAct: handleSidebarDeleteAct,
            onInsertAct: handleSidebarInsertAct,
            onReorderScene: handleSidebarReorderScene,
        },
    }), [
        actNamePreviewById,
        handleActNamePreview,
        handleSidebarDeleteAct,
        handleSidebarInsertAct,
        handleSidebarReorderScene,
        handleSidebarRenameAct,
        sourceIndexForSidebars,
    ]);
    const characterSidebarProps = useMemo(() => ({
        data: {
            confirmedCharacterRecords,
            pendingCharacterKeys,
            deletingCharacterIds,
            renamingCharacterIds,
            renamingCharacterKeys,
            colorUpdatingCharacterIds,
            genderUpdatingCharacterIds,
            characterGenderOptions,
            resolvedScriptSettings,
            characterColorSaturation: resolvedScriptSettings.visual.characterColorSaturation,
            isLoading: isCharactersLoading,
        },
        actions: {
            onConfirmCharacter: handleConfirmCharacter,
            onDeleteCharacter: handleDeleteCharacter,
            normalizeRenameInput: normalizeCharacterNameForInlineInput,
            onRenameCharacterPreview: handleRenameCharacterPreview,
            onRenameCharacter: handleRenameCharacter,
            onSetCharacterColor: handleSetCharacterColor,
            onSetCharacterGender: handleSetCharacterGender,
            onUpsertCharacterGender: handleUpsertCharacterGender,
        },
    }), [
        colorUpdatingCharacterIds,
        characterGenderOptions,
        confirmedCharacterRecords,
        deletingCharacterIds,
        genderUpdatingCharacterIds,
        handleConfirmCharacter,
        handleDeleteCharacter,
        handleRenameCharacter,
        handleRenameCharacterPreview,
        handleSetCharacterColor,
        handleSetCharacterGender,
        handleUpsertCharacterGender,
        isCharactersLoading,
        normalizeCharacterNameForInlineInput,
        pendingCharacterKeys,
        renamingCharacterIds,
        renamingCharacterKeys,
        resolvedScriptSettings,
    ]);
    const sidebarPanels = useMemo<readonly SidebarPanel[]>(() => [
        {
            id: 'structure',
            label: 'Structure',
            renderContent: () => <ScriptStructureSidebar {...structureSidebarProps} />,
            renderContextActions: () => (
                <StructureSidebarContextActions onInsertAct={handleSidebarInsertAct} />
            ),
        }, {
            id: 'characters',
            label: 'Characters',
            renderContent: () => <ScriptCharactersSidebar {...characterSidebarProps} />,
        },
    ], [
        characterSidebarProps,
        handleSidebarInsertAct,
        structureSidebarProps,
    ]);
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

    useEffect(() => {
        lastResolvedActiveBlockIdRef.current = undefined;
    }, [currentScriptId]);

    const showEditorLoader = editorLoadState.isLoading || !initialValue;

    if (showEditorLoader) {
        return (
            <LoaderOverlay
                title="Připravuji editor"
                subtitle="Načítám scénář a editorové prostředí"
                progress={editorLoadState.progress}
                statusText={editorLoadState.statusText}
                hint={storageError ?? 'Prosím vyčkejte, připravujeme editor.'}
            />
        );
    }

    if (!resolvedEditorInitialValue) {
        return null;
    }

    return (
        <AppLayout
            header={(
                currentScript ? (
                    <ScriptEditorAppHeader
                        currentScript={currentScript}
                        recentScripts={recentScripts}
                        onSelectScript={handleSelectScript}
                        onHome={handleHome}
                        onNewScript={handleNewScript}
                        onImportScript={openImportScript}
                        isImportLoading={isImportLoading}
                        scriptSyncState={saveIndicator}
                        onMenuAction={handleMenuAction}
                    />
                ) : (
                    <AppHeader
                        onHome={handleHome}
                        onNewScript={handleNewScript}
                        onImportScript={openImportScript}
                        isImportLoading={isImportLoading}
                        onMenuAction={handleMenuAction}
                    />
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
                requests={{
                    insertActRequest,
                    renameActRequest,
                    deleteActRequest,
                    moveSceneRequest,
                }}
                callbacks={{
                    onValueChange: handleResolvedEditorValueChange,
                    onActiveBlockChange: handleResolvedActiveBlockChange,
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
    );
};
