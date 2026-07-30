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
import {useEffect, useState} from 'react';
import {
    Navigate,
    Route,
    Routes,
} from 'react-router-dom';

import {prepareLocalDbWithProgress} from './db';
import {PrereleaseGate} from './prerelease/PrereleaseGate';
import type {ScriptRepository} from './repo';

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
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </GlobalModalsProvider>
            </ToastProvider>
        </ScriptRepositoryProvider>
    );
};

const App = () => (
    <PrereleaseGate>
        <BootedApp />
    </PrereleaseGate>
);

export default App;
