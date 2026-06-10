import {
    ScriptRepositoryProvider,
} from '@stagistic/app-core';
import {
    GlobalModalsProvider,
    HomeRoute,
    ScriptEditorRoute,
    ScriptListRoute,
    ScriptSettingsRoute,
} from '@stagistic/app-routes';
import {LoaderOverlay, ToastProvider} from '@stagistic/ui';
import {useEffect, useState} from 'react';
import {
    Navigate, Route, Routes,
} from 'react-router-dom';

import {scriptRepository} from './repo';

const App = () => {
    const [bootReady, setBootReady] = useState(false);
    const [bootProgress, setBootProgress] = useState(0);
    const [bootStatus, setBootStatus] = useState('Preparing');

    useEffect(() => {
        let isActive = true;

        const boot = async () => {
            setBootStatus('Loading fonts');
            if (document?.fonts) {
                await document.fonts.ready;
            }

            if (!isActive) {
                return;
            }

            setBootProgress(1);
            setBootStatus('Ready');
            setBootReady(true);
        };

        void boot();

        return () => {
            isActive = false;
        };
    }, []);

    if (!bootReady) {
        return (
            <LoaderOverlay
                title="Starting Stagistic"
                subtitle={bootStatus}
                progress={bootProgress}
                hint="Please wait while we set up your environment."
            />
        );
    }

    return (
        <ScriptRepositoryProvider repository={scriptRepository}>
            <ToastProvider>
                <GlobalModalsProvider>
                    <Routes>
                        <Route path="/" element={<HomeRoute />} />
                        <Route path="/script/list" element={<ScriptListRoute />} />
                        <Route path="/script/:scriptId/editor" element={<ScriptEditorRoute />} />
                        <Route path="/script/:scriptId/settings" element={<ScriptSettingsRoute />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </GlobalModalsProvider>
            </ToastProvider>
        </ScriptRepositoryProvider>
    );
};

export default App;
