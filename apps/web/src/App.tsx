import {ScriptDocumentSyncProvider, ScriptRepositoryProvider} from '@stagistic/app-core';
import {
    AuthCallbackRoute,
    CloudAccountProvider,
    GlobalModalsProvider,
    HomeRoute,
    ScriptEditorRoute,
    ScriptExportRoute,
    ScriptSettingsRoute,
    ScriptWorkspaceRoute,
    useAppBootstrap,
} from '@stagistic/app-routes';
import {createAuthClient} from '@stagistic/auth-client';
import {LoaderOverlay, ToastProvider} from '@stagistic/ui';
import {
    Navigate,
    Route,
    Routes,
} from 'react-router-dom';

import {cloudConfig} from './cloud/cloudConfig';
import {prepareLocalDbWithProgress} from './db';
import {PublicPreviewGate} from './publicPreview/PublicPreviewGate';
import {UnsupportedScreenGate} from './smallScreen/UnsupportedScreenGate';

const authClient = cloudConfig ? createAuthClient({authUrl: cloudConfig.authUrl}) : null;
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
    const scriptRepository = services?.scriptRepository ?? null;
    const documentSync = services?.documentSync ?? null;

    if (!scriptRepository) {
        return <LoaderOverlay label="Starting Stagistic" messages={[bootStatus]} progress={bootProgress} />;
    }

    return (
        <ScriptRepositoryProvider repository={scriptRepository}>
            <ScriptDocumentSyncProvider client={documentSync}>
                <ToastProvider>
                    <GlobalModalsProvider>
                        <CloudAccountProvider
                            auth={authClient}
                            cloud={cloudConfig ? documentSync?.cloud ?? null : null}
                            turnstileSiteKey={cloudConfig?.turnstileSiteKey ?? ''}
                        >
                            <Routes>
                                <Route path="/" element={<HomeRoute />} />
                                <Route path="/auth/callback" element={<AuthCallbackRoute />} />
                                <Route path="/script/:scriptId" element={<ScriptWorkspaceRoute />}>
                                    <Route index element={<Navigate to="editor" replace />} />
                                    <Route path="editor" element={<ScriptEditorRoute />} />
                                    <Route path="export" element={<ScriptExportRoute />} />
                                </Route>
                                <Route path="/script/:scriptId/settings" element={<ScriptSettingsRoute />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </CloudAccountProvider>
                    </GlobalModalsProvider>
                </ToastProvider>
            </ScriptDocumentSyncProvider>
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
