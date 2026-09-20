import {ScriptRepositoryProvider} from '@stagistic/app-core';
import {GlobalModalsProvider, HomeRoute, ScriptEditorRoute, ScriptExportRoute, ScriptSettingsRoute, ScriptWorkspaceRoute} from '@stagistic/app-routes';
import {LoaderOverlay, ToastProvider} from '@stagistic/ui';
import {getCurrentWindow} from '@tauri-apps/api/window';
import {useEffect, useState} from 'react';
import {Navigate, Route, Routes} from 'react-router-dom';

import {prepareLocalDbWithProgress, requestPersistentStorage} from './db';
import {startBackupSchedule, writeBackup} from './db/backups';
import {useNativeMenuActions} from './menu/useNativeMenuActions';
import type {ScriptRepository} from './repo';

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
            <Route path="/script/:scriptId/settings" element={<ScriptSettingsRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

const App = () => {
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

            await requestPersistentStorage();

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

    // Portable backup snapshots into the app data folder: periodic while running,
    // plus a best-effort snapshot when the window is closed.
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
        <ScriptRepositoryProvider repository={scriptRepository}>
            <ToastProvider>
                <GlobalModalsProvider>
                    <AppRoutes />
                </GlobalModalsProvider>
            </ToastProvider>
        </ScriptRepositoryProvider>
    );
};

export default App;
