import {
    DatabaseHandoverProvider,
    ScriptEditingLocksProvider,
    ScriptRepositoryProvider,
    UnsavedWorkHandoverBridge,
} from '@stagistic/app-core';
import {
    BootFailureScreen,
    DatabaseHandoverOverlay,
    GlobalModalsProvider,
    HomeRoute,
    PremigrationBackupAction,
    ReleaseUpdateProvider,
    RuntimeFileFailurePrompt,
    ScriptBoardRoute,
    ScriptEditorRoute,
    ScriptExportRoute,
    ScriptReleaseNotesProvider,
    ScriptSettingsRoute,
    ScriptWorkspaceRoute,
    useAppBootstrap,
    WaitingForDatabaseScreen,
} from '@stagistic/app-routes';
import {currentDbGeneration, formatDbGeneration} from '@stagistic/db/db-generation';
import {currentReleaseNumber, releases} from '@stagistic/release-notes/bundled';
import {installUnsavedWorkWarning} from '@stagistic/shared';
import {
    FocusVisibilityManager,
    LoaderOverlay,
    ToastProvider,
} from '@stagistic/ui';
import {useEffect} from 'react';
import {
    Navigate,
    Route,
    Routes,
} from 'react-router-dom';

import {BrowserNoticeGate} from './browserNotice/BrowserNoticeGate';
import {browserStorageSettingsSection} from './browserNotice/browserStorageSettingsSection';
import {
    databaseHandover,
    prepareLocalDbWithProgress,
    readPremigrationBackupFile,
} from './db';
import {browserEditingLocks} from './editingLocks';
import {UnsupportedScreenGate} from './smallScreen/UnsupportedScreenGate';

const settingsSections = [browserStorageSettingsSection];

const bootstrapOptions = {
    prepareDatabase: prepareLocalDbWithProgress,
    loadRepository: () => import('./repo'),
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
    const scriptRepository = services?.scriptRepository;
    const snapshotViews = services?.snapshotViews ?? null;

    if (failure) {
        return (
            <BootFailureScreen
                failure={failure}
                actions={failure.kind === 'migration-failed'
                    ? <PremigrationBackupAction loadBackup={readPremigrationBackupFile} />
                    : undefined}
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
        <ScriptEditingLocksProvider locks={browserEditingLocks}>
            <ScriptRepositoryProvider
                repository={scriptRepository}
                snapshotViews={snapshotViews}
            >
                <ToastProvider>
                    <ScriptReleaseNotesProvider
                        releaseNumber={currentReleaseNumber}
                        releases={releases}
                    >
                        <GlobalModalsProvider settingsSections={settingsSections}>
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
                        </GlobalModalsProvider>
                    </ScriptReleaseNotesProvider>
                </ToastProvider>
            </ScriptRepositoryProvider>
        </ScriptEditingLocksProvider>
    );
};

// One browser "leave site?" prompt for every owner of unsaved text; the desktop app never installs it.
const useUnsavedWorkWarning = () => {
    useEffect(() => installUnsavedWorkWarning(window), []);
};

const App = () => {
    useUnsavedWorkWarning();

    return (
        <>
            <FocusVisibilityManager />
            <UnsupportedScreenGate>
                <BrowserNoticeGate>
                    {/* Only the web is deployed, so only it watches for a newer Release. */}
                    <ReleaseUpdateProvider currentRelease={currentReleaseNumber} dbGeneration={formatDbGeneration(currentDbGeneration)}>
                        <DatabaseHandoverProvider handover={databaseHandover}>
                            <BootedApp />
                            <UnsavedWorkHandoverBridge />
                            <DatabaseHandoverOverlay />
                        </DatabaseHandoverProvider>
                        <RuntimeFileFailurePrompt />
                    </ReleaseUpdateProvider>
                </BrowserNoticeGate>
            </UnsupportedScreenGate>
        </>
    );
};

export default App;
