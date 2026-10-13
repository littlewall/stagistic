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
} from '@stagistic/app-routes';
import {createAuthClient} from '@stagistic/auth-client';
import type {SyncEngineClient} from '@stagistic/sync-engine';
import {LoaderOverlay, ToastProvider} from '@stagistic/ui';
import {
    useEffect,
    useState,
} from 'react';
import {
    Navigate,
    Route,
    Routes,
} from 'react-router-dom';

import {cloudConfig} from './cloud/cloudConfig';
import {prepareLocalDbWithProgress} from './db';
import {PublicPreviewGate} from './publicPreview/PublicPreviewGate';
import type {ScriptRepository} from './repo';
import {UnsupportedScreenGate} from './smallScreen/UnsupportedScreenGate';

const authClient = cloudConfig ? createAuthClient({authUrl: cloudConfig.authUrl}) : null;

const BootedApp = () => {
    const [scriptRepository, setScriptRepository] = useState<ScriptRepository | null>(null);
    const [documentSync, setDocumentSync] = useState<SyncEngineClient | null>(null);
    const [bootProgress, setBootProgress] = useState(0);
    const [bootStatus, setBootStatus] = useState('Preparing');

    useEffect(() => {
        let isActive = true;

        const boot = async () => {
            if (document?.fonts) {
                await document.fonts.ready;
            }

            if (!isActive) {
                return;
            }

            await prepareLocalDbWithProgress(update => {
                if (!isActive) {
                    return;
                }

                setBootProgress(update.progress);
                setBootStatus(update.label);
            });

            if (!isActive) {
                return;
            }

            const repositoryModule = await import('./repo');

            if (!isActive) {
                return;
            }

            setDocumentSync(repositoryModule.documentSync);
            setScriptRepository(repositoryModule.scriptRepository);
        };

        void boot();

        return () => {
            isActive = false;
        };
    }, []);

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
