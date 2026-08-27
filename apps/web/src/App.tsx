import {
    ScriptRepositoryProvider,
} from '@stagistic/app-core';
import {
    GlobalModalsProvider,
    HomeRoute,
    ScriptEditorRoute,
    ScriptExportRoute,
    ScriptSettingsRoute,
    ScriptWorkspaceRoute,
} from '@stagistic/app-routes';
import {LoaderOverlay, ToastProvider} from '@stagistic/ui';
import {
    lazy, Suspense, useEffect, useState,
} from 'react';
import {
    Navigate,
    Route,
    Routes,
} from 'react-router-dom';

import {prepareLocalDbWithProgress} from './db';
import {PublicPreviewGate} from './publicPreview/PublicPreviewGate';
import type {ScriptRepository} from './repo';
import {UnsupportedScreenGate} from './smallScreen/UnsupportedScreenGate';

const DevUiRoute = import.meta.env.DEV
    ? lazy(() => import('./dev/DevUiRoute').then(module => ({default: module.DevUiRoute})))
    : null;
const EditorBlocksDemoRoute = import.meta.env.DEV
    ? lazy(() => import('./dev/EditorBlocksDemoRoute').then(module => ({default: module.EditorBlocksDemoRoute})))
    : null;

const BootedApp = () => {
    const [scriptRepository, setScriptRepository] = useState<ScriptRepository | null>(null);
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

            setScriptRepository(repositoryModule.scriptRepository);
        };

        void boot();

        return () => {
            isActive = false;
        };
    }, []);

    if (!scriptRepository) {
        return (
            <LoaderOverlay
                label="Starting Stagistic"
                messages={[bootStatus]}
                progress={bootProgress}
            />
        );
    }

    return (
        <ScriptRepositoryProvider repository={scriptRepository}>
            <ToastProvider>
                <GlobalModalsProvider>
                    <Routes>
                        <Route path="/" element={<HomeRoute />} />
                        <Route path="/script/:scriptId" element={<ScriptWorkspaceRoute />}>
                            <Route index element={<Navigate to="editor" replace />} />
                            <Route path="editor" element={<ScriptEditorRoute />} />
                            <Route path="export" element={<ScriptExportRoute />} />
                        </Route>
                        <Route path="/script/:scriptId/settings" element={<ScriptSettingsRoute />} />
                        {DevUiRoute ? (
                            <Route
                                path="/dev/ui"
                                element={(
                                    <Suspense fallback={null}>
                                        <DevUiRoute />
                                    </Suspense>
                                )}
                            />
                        ) : null}
                        {EditorBlocksDemoRoute ? (
                            <Route
                                path="/dev/demos/editor-blocks"
                                element={(
                                    <Suspense fallback={null}>
                                        <EditorBlocksDemoRoute />
                                    </Suspense>
                                )}
                            />
                        ) : null}
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
