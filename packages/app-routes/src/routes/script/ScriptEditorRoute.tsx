import {FountainEditor} from '@stagistic/editor-ui';
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
    useState,
} from 'react';
import {
    useNavigate,
    useParams,
    useSearchParams,
} from 'react-router-dom';

import {useGlobalModals} from '../../global-modals/GlobalModalsProvider';
import {SCRIPT_SETTINGS_PANEL_SOURCE, type ScriptSettingsPanelId} from './settings/settingsMenu';
import {useScriptSettingsModalState} from './settings/useScriptSettingsModalState';
import styles from './ScriptEditorRoute.module.css';
import {useScriptEditorController} from './useScriptEditorController';

const AUTOSAVE_DELAY_MS = 1500;
const SIDEBAR_WIDTH = 'calc(280px * var(--size-scale))';
const SETTINGS_MODAL_QUERY_KEY = 'settingsModal';

const panelDescriptions: Record<ScriptSettingsPanelId, {
    title: string,
    description: string,
}> = {
    'settings-source': {
        title: 'Settings Source',
        description: 'Choose whether this script inherits global settings or uses a local override.',
    },
    'document-info': {
        title: 'Document Info',
        description: 'Document metadata panel placeholder.',
    },
    production: {
        title: 'Production',
        description: 'Production panel placeholder.',
    },
    'page-layout': {
        title: 'Page Layout',
        description: 'Page size, margins, and typography settings will be added here.',
    },
    'headers-footers': {
        title: 'Headers and Footers',
        description: 'Header and footer controls placeholder.',
    },
    'document-statuses': {
        title: 'Document Statuses',
        description: 'Document statuses setup placeholder.',
    },
    notes: {
        title: 'Notes',
        description: 'Document notes configuration placeholder.',
    },
    'elements-style': {
        title: 'Element Style',
        description: 'Element formatting controls placeholder.',
    },
    'elements-visibility': {
        title: 'Element Visibility',
        description: 'Element visibility controls placeholder.',
    },
    'account-writing': {
        title: 'Writing Preferences',
        description: 'Account writing preferences placeholder.',
    },
    'account-profile': {
        title: 'Profile',
        description: 'Profile settings placeholder.',
    },
    'account-notifications': {
        title: 'Notifications',
        description: 'Notifications settings placeholder.',
    },
    'account-security': {
        title: 'Password & Security',
        description: 'Security settings placeholder.',
    },
    'account-billing': {
        title: 'Billing',
        description: 'Billing settings placeholder.',
    },
    'account-ai': {
        title: 'AI',
        description: 'AI settings placeholder.',
    },
    'project-statuses': {
        title: 'Project Statuses',
        description: 'Project statuses placeholder.',
    },
};

export const ScriptEditorRoute = () => {
    const navigate = useNavigate();
    const {scriptId} = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const {openNewScript} = useGlobalModals();
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
    const {
        isOpen: isSettingsOpen,
        activePanelId,
        expandedItemIds,
        groups,
        isOverrideEnabled,
        open: openSettingsModal,
        close: closeSettingsModal,
        selectPanel,
        toggleExpanded,
        toggleOverride,
    } = useScriptSettingsModalState();
    const {
        currentScript,
        recentScripts,
        initialValue,
        storageError,
        shouldAutoFocus,
        saveIndicator,
        editorLoadState,
        handleAutoSave,
        handleManualSave,
    } = useScriptEditorController(scriptId);

    const scenes = useMemo(() => {
        return [];
    }, []);

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
    const handleSceneClick = useCallback(() => {}, []);
    const handleToggleLeftSidebar = useCallback(() => {
        setIsLeftSidebarOpen(previous => !previous);
    }, []);
    const handleToggleRightSidebar = useCallback(() => {
        setIsRightSidebarOpen(previous => !previous);
    }, []);
    const renderSettingsPanel = useCallback((panelId: string) => {
        const panel = panelDescriptions[panelId as ScriptSettingsPanelId];

        if (!panel) {
            return (
                <div>
                    <h3 className={styles.panelTitle}>Settings</h3>
                    <p className={styles.panelDescription}>No panel configured for this item yet.</p>
                </div>
            );
        }

        if (panelId === SCRIPT_SETTINGS_PANEL_SOURCE) {
            return (
                <div className={styles.panelStack}>
                    <h3 className={styles.panelTitle}>{panel.title}</h3>
                    <p className={styles.panelDescription}>{panel.description}</p>
                    <label className={styles.overrideCard}>
                        <span className={styles.overrideLabel}>Override for this script</span>
                        <span className={styles.overrideHint}>
                            Use local script settings instead of global defaults.
                        </span>
                        <input
                            type="checkbox"
                            checked={isOverrideEnabled}
                            onChange={toggleOverride}
                        />
                    </label>
                    <p className={styles.panelCaption}>
                        Skeleton mode: persistence is not wired yet.
                    </p>
                </div>
            );
        }

        return (
            <div className={styles.panelStack}>
                <h3 className={styles.panelTitle}>{panel.title}</h3>
                <p className={styles.panelDescription}>{panel.description}</p>
                <div className={styles.placeholderCard}>
                    Coming soon
                </div>
            </div>
        );
    }, [
        isOverrideEnabled,
        toggleOverride,
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
                initialValue={initialValue}
                onAutoSave={handleAutoSave}
                onManualSave={handleManualSave}
                autoSaveDelayMs={AUTOSAVE_DELAY_MS}
                autoFocus={shouldAutoFocus}
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
                        scenes={scenes}
                        onSceneClick={handleSceneClick}
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
