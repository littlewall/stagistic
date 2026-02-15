import {useScriptRepository} from '@stagistic/app-core';
import {type FountainElementType} from '@stagistic/editor-core';
import {
    FountainEditor,
} from '@stagistic/editor-ui';
import {
    DEFAULT_EDITOR_SETTINGS,
    type EditorSettings,
    type EditorSettingsOverride,
    isApplePlatform,
    mergeEditorSettings,
} from '@stagistic/shared';
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
    useRef,
    useState,
} from 'react';
import {
    useNavigate,
    useParams,
    useSearchParams,
} from 'react-router-dom';

import {useGlobalModals} from '../../global-modals/GlobalModalsProvider';
import {
    type BlockSettingsPatch,
    normalizeSettingsOverride,
    ScriptEditorSettingsPanel,
} from './editor/ScriptEditorSettingsPanel';
import {useScriptEditorCharacters} from './editor/useScriptEditorCharacters';
import styles from './ScriptEditorRoute.module.css';
import {
    SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS,
    type ScriptSettingsPanelId,
} from './settings/settingsMenu';
import {useScriptSettingsModalState} from './settings/useScriptSettingsModalState';
import {useScriptEditorController} from './useScriptEditorController';

const AUTOSAVE_DELAY_MS = 1500;
const SETTINGS_SAVE_DEBOUNCE_MS = 450;
const SIDEBAR_WIDTH = 'calc(280px * var(--size-scale))';
const SETTINGS_MODAL_QUERY_KEY = 'settingsModal';

export const ScriptEditorRoute = () => {
    const navigate = useNavigate();
    const {scriptId} = useParams();
    const scriptRepository = useScriptRepository();
    const [searchParams, setSearchParams] = useSearchParams();
    const {openNewScript} = useGlobalModals();
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
    const [scriptSettingsDraft, setScriptSettingsDraft] = useState<EditorSettingsOverride>({});
    const settingsSaveTimerRef = useRef<number | null>(null);
    const hydratedSettingsScriptIdRef = useRef<string | null>(null);
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

    const shortcutPrefix = useMemo(
        () => isApplePlatform() ? 'Cmd' : 'Ctrl',
        [],
    );
    const blockLabelByType = useMemo(() => {
        return new Map(
            SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS.map(item => [item.blockType, item.label]),
        );
    }, []);
    const resolvedScriptSettings = useMemo<EditorSettings>(
        () => mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, scriptSettingsDraft),
        [scriptSettingsDraft],
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

    const draftSerialized = useMemo(
        () => JSON.stringify(scriptSettingsDraft ?? {}),
        [scriptSettingsDraft],
    );
    const loadedSerialized = useMemo(
        () => JSON.stringify(scriptSettingsOverride ?? {}),
        [scriptSettingsOverride],
    );

    const clearSettingsSaveTimer = useCallback(() => {
        if (!settingsSaveTimerRef.current) {
            return;
        }

        window.clearTimeout(settingsSaveTimerRef.current);
        settingsSaveTimerRef.current = null;
    }, []);

    useEffect(() => {
        hydratedSettingsScriptIdRef.current = null;
        setScriptSettingsDraft({});
    }, [currentScriptId]);

    useEffect(() => {
        if (!currentScriptId || scriptSettingsOverride === undefined) {
            return;
        }

        if (hydratedSettingsScriptIdRef.current === currentScriptId) {
            return;
        }

        setScriptSettingsDraft(normalizeSettingsOverride(scriptSettingsOverride ?? {}));
        hydratedSettingsScriptIdRef.current = currentScriptId;
    }, [currentScriptId, scriptSettingsOverride]);

    useEffect(() => {
        if (!currentScriptId || scriptSettingsOverride === undefined) {
            return;
        }

        if (draftSerialized === loadedSerialized) {
            return;
        }

        clearSettingsSaveTimer();

        const snapshot = scriptSettingsDraft;

        settingsSaveTimerRef.current = window.setTimeout(() => {
            void handleSaveScriptSettingsOverride(snapshot);
        }, SETTINGS_SAVE_DEBOUNCE_MS);

        return () => {
            clearSettingsSaveTimer();
        };
    }, [
        clearSettingsSaveTimer,
        currentScriptId,
        draftSerialized,
        handleSaveScriptSettingsOverride,
        loadedSerialized,
        scriptSettingsDraft,
        scriptSettingsOverride,
    ]);

    useEffect(() => {
        return () => {
            clearSettingsSaveTimer();
        };
    }, [clearSettingsSaveTimer]);

    const handleSelectScript = useCallback((script: {id: string}) => {
        void navigate(`/script/${script.id}/editor`);
    }, [navigate]);
    const handleHome = useCallback(() => {
        void navigate('/');
    }, [navigate]);
    const handleNewScript = useCallback(() => {
        openNewScript();
    }, [openNewScript]);
    const handleMenuAction = useCallback((actionId: string) => {
        if (actionId === 'scripts') {
            void navigate('/script/list');

            return;
        }

        if (actionId === 'settings' && currentScript) {
            openSettingsModal();

            return;
        }

        if (actionId === 'new-script') {
            openNewScript();
        }
    }, [
        currentScript,
        navigate,
        openSettingsModal,
        openNewScript,
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
    const handleToggleLeftSidebar = useCallback(() => {
        setIsLeftSidebarOpen(previous => !previous);
    }, []);
    const handleToggleRightSidebar = useCallback(() => {
        setIsRightSidebarOpen(previous => !previous);
    }, []);

    const updateBlockSettings = useCallback((
        blockType: FountainElementType,
        patch: BlockSettingsPatch,
    ) => {
        setScriptSettingsDraft(previous => ({
            ...previous,
            blocks: {
                ...previous.blocks ?? {},
                [blockType]: {
                    ...previous.blocks?.[blockType] ?? {},
                    ...patch,
                },
            },
        }));
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
                leftSidebarToggle={{
                    isOpen: isLeftSidebarOpen,
                    onToggle: handleToggleLeftSidebar,
                }}
                rightSidebarToggle={{
                    isOpen: isRightSidebarOpen,
                    onToggle: handleToggleRightSidebar,
                }}
                leftSidebar={<div className={styles.sidebarPlaceholder} />}
                rightSidebar={(
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
                )}
                sidebarWidth={SIDEBAR_WIDTH}
            />
            <ScriptSettingsModal
                isOpen={isSettingsOpen}
                title={currentScript ? `${currentScript.name} Settings` : 'Script Settings'}
                groups={groups}
                activePanelId={activePanelId}
                expandedItemIds={expandedItemIds}
                onClose={handleCloseSettings}
                onSelectPanel={panelId => selectPanel(panelId as ScriptSettingsPanelId)}
                onToggleExpand={toggleExpanded}
                renderPanel={renderSettingsPanel}
            />
        </AppLayout>
    );
};
