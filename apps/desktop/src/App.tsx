import {ScriptRepositoryProvider} from '@stagistic/app-core';
import {
    type AppSettingsSection,
    GlobalModalsProvider,
    HomeRoute,
    ScriptEditorRoute,
    ScriptExportRoute,
    ScriptSettingsRoute,
    ScriptWorkspaceRoute,
    useAppBootstrap,
} from '@stagistic/app-routes';
import {LoaderOverlay, ToastProvider} from '@stagistic/ui';
import {getCurrentWindow} from '@tauri-apps/api/window';
import {useEffect} from 'react';
import {
    Navigate,
    Route,
    Routes,
} from 'react-router-dom';

import {prepareLocalDbWithProgress, requestPersistentStorage} from './db';
import {startBackupSchedule, writeBackup} from './db/backups';
import {McpSettingsPanel} from './mcp/McpSettingsPanel';
import {useLocalMcp} from './mcp/useLocalMcp';
import {useNativeMenuActions} from './menu/useNativeMenuActions';

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
];

// Runs inside the router + providers so it can use navigation and modal hooks.
const AppRoutes = () => {
    useNativeMenuActions();

    return (
        <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/script/:scriptId" element={<ScriptWorkspaceRoute />}>
                <Route index element={<Navigate to="editor" replace />} />
                <Route path="editor" element={<ScriptEditorRoute />} />
                <Route path="export" element={<ScriptExportRoute />} />
            </Route>
            <Route path="/script/:scriptId/snapshots/:snapshotId" element={<ScriptWorkspaceRoute />}>
                <Route index element={<Navigate to="editor" replace />} />
                <Route path="editor" element={<ScriptEditorRoute />} />
                <Route path="export" element={<ScriptExportRoute />} />
            </Route>
            <Route path="/script/:scriptId/settings" element={<ScriptSettingsRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

const App = () => {
    const {
        services,
        bootProgress,
        bootStatus,
    } = useAppBootstrap(bootstrapOptions);
    const scriptRepository = services?.scriptRepository ?? null;
    const snapshotViews = services?.snapshotViews ?? null;

    useLocalMcp(Boolean(scriptRepository));

    /*
     * Portable backup snapshots into the app data folder: periodic while running,
     * plus a best-effort snapshot when the window is closed.
     */
    useEffect(() => {
        if (!scriptRepository) {
            return undefined;
        }

        const schedule = startBackupSchedule();
        const unlistenPromise = getCurrentWindow().onCloseRequested(() => {
            void writeBackup().catch(error => {
                console.error('Backup on close failed', error);
            });
        });

        return () => {
            schedule.stop();
            void unlistenPromise.then(dispose => dispose());
        };
    }, [scriptRepository]);

    if (!scriptRepository) {
        return <LoaderOverlay label="Starting Stagistic" messages={[bootStatus]} progress={bootProgress} />;
    }

    return (
        <ScriptRepositoryProvider
            repository={scriptRepository}
            snapshotViews={snapshotViews}
        >
            <ToastProvider>
                <GlobalModalsProvider settingsSections={settingsSections}>
                    <AppRoutes />
                </GlobalModalsProvider>
            </ToastProvider>
        </ScriptRepositoryProvider>
    );
};

export default App;
