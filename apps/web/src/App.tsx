import {ScriptRepositoryProvider} from '@stagistic/app-core';
import {
    GlobalModalsProvider,
    HomeRoute,
    ScriptEditorRoute,
    ScriptExportRoute,
    ScriptSettingsRoute,
    ScriptWorkspaceRoute,
    useAppBootstrap,
} from '@stagistic/app-routes';
import {LoaderOverlay, ToastProvider} from '@stagistic/ui';
import {
    Navigate,
    Route,
    Routes,
} from 'react-router-dom';

import {prepareLocalDbWithProgress} from './db';
import {PublicPreviewGate} from './publicPreview/PublicPreviewGate';
import {UnsupportedScreenGate} from './smallScreen/UnsupportedScreenGate';

const bootstrapOptions = {
    prepareDatabase: prepareLocalDbWithProgress,
    loadRepository: () => import('./repo'),
};

const BootedApp = () => {
    const {
        services,
        bootProgress,
        bootStatus,
    } = useAppBootstrap(bootstrapOptions);
    const scriptRepository = services?.scriptRepository;
    const snapshotViews = services?.snapshotViews ?? null;

    if (!scriptRepository) {
        return <LoaderOverlay label="Starting Stagistic" messages={[bootStatus]} progress={bootProgress} />;
    }

    return (
        <ScriptRepositoryProvider
            repository={scriptRepository}
            snapshotViews={snapshotViews}
        >
            <ToastProvider>
                <GlobalModalsProvider>
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
                </GlobalModalsProvider>
            </ToastProvider>
        </ScriptRepositoryProvider>
    );
};

const App = () => (
    <UnsupportedScreenGate>
        <PublicPreviewGate>
            <BootedApp />
        </PublicPreviewGate>
    </UnsupportedScreenGate>
);

export default App;
