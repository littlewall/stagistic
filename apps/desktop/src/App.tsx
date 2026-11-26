import {
    DatabaseHandoverProvider,
    ScriptRepositoryProvider,
    UnsavedWorkHandoverBridge,
} from '@stagistic/app-core';
import {
    type AppSettingsSection,
    BootFailureScreen,
    DatabaseHandoverOverlay,
    GlobalModalsProvider,
    HomeRoute,
    SaveFileProvider,
    ScriptBoardRoute,
    ScriptEditorRoute,
    ScriptExportRoute,
    ScriptMenuActionsProvider,
    ScriptReleaseNotesProvider,
    ScriptSettingsRoute,
    ScriptWorkspaceRoute,
    useAppBootstrap,
    WaitingForDatabaseScreen,
} from '@stagistic/app-routes';
import {currentReleaseNumber, releases} from '@stagistic/release-notes/bundled';
import {
    AppBannerProvider,
    LoaderOverlay,
    NoticeBar,
    ToastProvider,
} from '@stagistic/ui';
import {
    useEffect,
    useMemo,
} from 'react';
import {
    Navigate,
    Route,
    Routes,
} from 'react-router-dom';

import {
    databaseHandover,
    prepareLocalDbWithProgress,
    requestPersistentStorage,
} from './db';
import {startBackupSchedule} from './db/backups';
import {openDownloadPage, showBackupsFolder} from './db/backupsFolder';
import {RestoreDiscardedNotice} from './db/RestoreDiscardedNotice';
import {saveFileWithDialog} from './files/saveFile';
import {DOWNLOAD_URL} from './lifecycle/updateNotice';
import {DesktopUpdatesProvider} from './lifecycle/updatesContext';
import {useDesktopLifecycle} from './lifecycle/useDesktopLifecycle';
import {openExternalUrl} from './links/externalLinks';
import {McpSettingsPanel} from './mcp/McpSettingsPanel';
import {useDeepLinkNavigation} from './mcp/useDeepLinkNavigation';
import {useLocalMcp} from './mcp/useLocalMcp';
import {useNativeMenuActions} from './menu/useNativeMenuActions';
import {StorageSettings} from './storage/StorageSettings';
import {UpdatesSettings} from './updates/UpdatesSettings';

const bootstrapOptions = {
    beforeDatabase: requestPersistentStorage,
    prepareDatabase: prepareLocalDbWithProgress,
    loadRepository: () => import('./repo'),
};

const settingsSections: AppSettingsSection[] = [
    {
        id: 'mcp',
        label: 'MCP',
        content: <McpSettingsPanel />,
    },
    {
        id: 'storage',
        label: 'Storage',
        content: <StorageSettings />,
    },
    {
        id: 'updates',
        label: 'About app',
        content: <UpdatesSettings />,
    },
];

// Runs inside the router + providers so it can use navigation and modal hooks.
const AppRoutes = () => {
    useNativeMenuActions();
    useDeepLinkNavigation();

    return (
        <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/script/:scriptId" element={<ScriptWorkspaceRoute />}>
                <Route index element={<Navigate to="editor" replace />} />
                <Route path="editor" element={<ScriptEditorRoute />} />
                <Route path="board">
                    <Route index element={<Navigate to="wall" replace />} />
                    <Route path=":lens" element={<ScriptBoardRoute />} />
                </Route>
                <Route path="export" element={<ScriptExportRoute />} />
            </Route>
            <Route path="/script/:scriptId/snapshots/:snapshotId" element={<ScriptWorkspaceRoute />}>
                <Route index element={<Navigate to="editor" replace />} />
                <Route path="editor" element={<ScriptEditorRoute />} />
                <Route path="board">
                    <Route index element={<Navigate to="wall" replace />} />
                    <Route path=":lens" element={<ScriptBoardRoute />} />
                </Route>
                <Route path="export" element={<ScriptExportRoute />} />
            </Route>
            <Route path="/script/:scriptId/settings" element={<ScriptSettingsRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

const BootedApp = () => {
    const {
        services,
        bootProgress,
        bootStatus,
        failure,
        waitingNotice,
        waitingSilent,
    } = useAppBootstrap(bootstrapOptions);
    const scriptRepository = services?.scriptRepository ?? null;
    const snapshotViews = services?.snapshotViews ?? null;

    useLocalMcp(Boolean(scriptRepository));

    const {
        dialogs: lifecycleDialogs,
        updates,
        notice,
        hideNotice,
    } = useDesktopLifecycle(Boolean(scriptRepository));
    const footerUpdate = useMemo(() => (
        updates.state.status === 'ready'
            ? {label: `Release ${updates.state.release} is ready. Restart`, onPress: updates.restart}
            : undefined
    ), [updates.state, updates.restart]);

    /*
     * Portable backup snapshots into the app data folder while running; the
     * final one is written by the safe-shutdown sequence (see lifecycle/).
     */
    useEffect(() => {
        if (!scriptRepository) {
            return undefined;
        }

        const schedule = startBackupSchedule();

        return () => {
            schedule.stop();
        };
    }, [scriptRepository]);

    const banner = notice.visible && notice.notice ? (
        <NoticeBar
            message={notice.notice.message}
            actionLabel="Download"
            onAction={() => void openExternalUrl(notice.notice?.url ?? DOWNLOAD_URL).catch(() => undefined)}
            onHide={hideNotice}
        />
    ) : null;

    if (failure) {
        return (
            <BootFailureScreen
                surface="desktop"
                failure={failure}
                onOpenDownloadPage={() => void openDownloadPage()}
                onShowBackupsFolder={() => void showBackupsFolder()}
            />
        );
    }

    if (!scriptRepository) {
        if (waitingNotice) {
            return <WaitingForDatabaseScreen status={bootStatus} progress={bootProgress} canReload={waitingSilent} />;
        }

        return <LoaderOverlay label="Starting Stagistic" messages={[bootStatus]} progress={bootProgress} />;
    }

    return (
        <ScriptRepositoryProvider
            repository={scriptRepository}
            snapshotViews={snapshotViews}
        >
            <ToastProvider>
                <RestoreDiscardedNotice />
                <DesktopUpdatesProvider value={updates}>
                    <ScriptReleaseNotesProvider
                        releaseNumber={currentReleaseNumber}
                        releases={releases}
                        surface="desktop"
                        footerUpdate={footerUpdate}
                    >
                        <GlobalModalsProvider settingsSections={settingsSections}>
                            <AppBannerProvider banner={banner}>
                                <ScriptMenuActionsProvider>
                                    <AppRoutes />
                                </ScriptMenuActionsProvider>
                            </AppBannerProvider>
                            {lifecycleDialogs}
                        </GlobalModalsProvider>
                    </ScriptReleaseNotesProvider>
                </DesktopUpdatesProvider>
            </ToastProvider>
        </ScriptRepositoryProvider>
    );
};

const App = () => (
    <SaveFileProvider saveFile={saveFileWithDialog} verb="Save">
        <DatabaseHandoverProvider handover={databaseHandover}>
            <BootedApp />
            <UnsavedWorkHandoverBridge />
            <DatabaseHandoverOverlay />
        </DatabaseHandoverProvider>
    </SaveFileProvider>
);

export default App;
