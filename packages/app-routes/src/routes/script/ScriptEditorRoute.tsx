import {useScriptRepository} from '@stagistic/app-core';
import {
    FountainEditor,
} from '@stagistic/editor-ui';
import {isApplePlatform} from '@stagistic/platform-core';
import {
    AppHeader,
    AppLayout,
    EditorSidebar,
    LoaderOverlay,
    ScriptSettingsModal,
} from '@stagistic/ui';
import {
    useCallback,
    useEffect,
    useMemo,
} from 'react';
import {
    useNavigate,
    useParams,
    useSearchParams,
} from 'react-router-dom';

import {useGlobalModals} from '../../global-modals/GlobalModalsProvider';
import {useScriptEditorCharacters} from './editor/characters/useScriptEditorCharacters';
import {
    ScriptEditorSettingsPanel,
} from './editor/settings';
import styles from './ScriptEditorRoute.module.css';
import {
    SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS,
    type ScriptSettingsPanelId,
} from './settings/settingsMenu';
import {useScriptSettingsModalState} from './settings/useScriptSettingsModalState';
import {useScriptEditorController} from './useScriptEditorController';
import {useScriptEditorHeaderActions} from './useScriptEditorHeaderActions';
import {useScriptEditorLayoutState} from './useScriptEditorLayoutState';
import {useScriptEditorSettingsDraft} from './useScriptEditorSettingsDraft';

const AUTOSAVE_DELAY_MS = 1500;
const SIDEBAR_WIDTH = 'calc(280px * var(--size-scale))';
const SETTINGS_MODAL_QUERY_KEY = 'settingsModal';

export const ScriptEditorRoute = () => {
    const navigate = useNavigate();
    const {scriptId} = useParams();
    const scriptRepository = useScriptRepository();
    const [searchParams, setSearchParams] = useSearchParams();
    const {openNewScript} = useGlobalModals();
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
    } = useScriptEditorSettingsDraft({
        currentScriptId,
        scriptSettingsOverride,
        handleSaveScriptSettingsOverride,
    });
    const {
        isLeftSidebarOpen,
        isRightSidebarOpen,
        handleToggleLeftSidebar,
        handleToggleRightSidebar,
    } = useScriptEditorLayoutState();
    const leftSidebarToggle = useMemo(() => ({
        isOpen: isLeftSidebarOpen,
        onToggle: handleToggleLeftSidebar,
    }), [handleToggleLeftSidebar, isLeftSidebarOpen]);
    const rightSidebarToggle = useMemo(() => ({
        isOpen: isRightSidebarOpen,
        onToggle: handleToggleRightSidebar,
    }), [handleToggleRightSidebar, isRightSidebarOpen]);
    const shortcutPrefix = useMemo(
        () => isApplePlatform() ? 'Cmd' : 'Ctrl',
        [],
    );

    const {
        editorOverrideValue,
        normalizedConfirmedCharacterRecords,
        confirmedCharacters,
        unconfirmedCharacters,
        isCharactersLoading,
        handleEditorValueChange,
        normalizeCharacterNameForInlineInput,
        handleConfirmCharacter,
        handleDeleteCharacter,
        handleRenameCharacterPreview,
        handleRenameCharacter,
    } = useScriptEditorCharacters({
        currentScriptId,
        scriptRepository,
        initialValue,
        resolvedScriptSettings,
        handleAutoSave,
    });

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

    const blockLabelByType = useMemo(() => {
        return new Map(
            SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS.map(item => [item.blockType, item.label]),
        );
    }, []);

    const renderSettingsPanel = useCallback((panelId: string) => {
        return (
            <ScriptEditorSettingsPanel
                panelId={panelId}
                resolvedScriptSettings={resolvedScriptSettings}
                blockLabelByType={blockLabelByType}
                shortcutPrefix={shortcutPrefix}
                onUpdateBlockSettings={updateBlockSettings}
            />
        );
    }, [
        blockLabelByType,
        resolvedScriptSettings,
        shortcutPrefix,
        updateBlockSettings,
    ]);
    const handleSelectSettingsPanel = useCallback((panelId: string) => {
        selectPanel(panelId as ScriptSettingsPanelId);
    }, [selectPanel]);
    const leftSidebarContent = useMemo(() => (
        <div className={styles.sidebarPlaceholder} />
    ), []);
    const rightSidebarContent = useMemo(() => (
        <EditorSidebar
            confirmedCharacters={confirmedCharacters}
            unconfirmedCharacters={unconfirmedCharacters}
            onConfirmCharacter={handleConfirmCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            normalizeRenameInput={normalizeCharacterNameForInlineInput}
            onRenameCharacterPreview={handleRenameCharacterPreview}
            onRenameCharacter={handleRenameCharacter}
            isLoading={isCharactersLoading}
            className={styles.sidebarContent}
        />
    ), [
        confirmedCharacters,
        handleConfirmCharacter,
        handleDeleteCharacter,
        handleRenameCharacter,
        handleRenameCharacterPreview,
        isCharactersLoading,
        normalizeCharacterNameForInlineInput,
        unconfirmedCharacters,
    ]);

    const handleCloseSettings = useCallback(() => {
        closeSettingsModal();

        if (!searchParams.has(SETTINGS_MODAL_QUERY_KEY)) {
            return;
        }

        setSearchParams(previous => {
            const next = new URLSearchParams(previous);

            next.delete(SETTINGS_MODAL_QUERY_KEY);

            return next;
        }, {replace: true});
    }, [
        closeSettingsModal,
        searchParams,
        setSearchParams,
    ]);

    useEffect(() => {
        if (searchParams.get(SETTINGS_MODAL_QUERY_KEY) !== '1') {
            return;
        }

        openSettingsModal();
    }, [openSettingsModal, searchParams]);

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

    return (
        <AppLayout
            header={(
                <AppHeader
                    currentScript={currentScript ?? undefined}
                    recentScripts={recentScripts}
                    onSelectScript={handleSelectScript}
                    onHome={handleHome}
                    onNewScript={handleNewScript}
                    scriptSyncState={saveIndicator}
                    onMenuAction={handleMenuAction}
                />
            )}
        >
            {storageError ? (
                <div role="alert" style={{padding: '12px 20px'}}>
                    {storageError}
                </div>
            ) : null}
            <FountainEditor
                key={currentScript?.id ?? 'editor'}
                initialValue={editorOverrideValue ?? initialValue}
                scriptSettings={scriptSettingsDraft}
                onValueChange={handleEditorValueChange}
                onAutoSave={handleAutoSave}
                onManualSave={handleManualSave}
                autoSaveDelayMs={AUTOSAVE_DELAY_MS}
                autoFocus={shouldAutoFocus}
                persistentCharacters={normalizedConfirmedCharacterRecords}
                leftSidebarToggle={leftSidebarToggle}
                rightSidebarToggle={rightSidebarToggle}
                leftSidebar={leftSidebarContent}
                rightSidebar={rightSidebarContent}
                sidebarWidth={SIDEBAR_WIDTH}
            />
            <ScriptSettingsModal
                isOpen={isSettingsOpen}
                title={currentScript ? `${currentScript.name} Settings` : 'Script Settings'}
                groups={groups}
                activePanelId={activePanelId}
                expandedItemIds={expandedItemIds}
                onClose={handleCloseSettings}
                onSelectPanel={handleSelectSettingsPanel}
                onToggleExpand={toggleExpanded}
                renderPanel={renderSettingsPanel}
            />
        </AppLayout>
    );
};
