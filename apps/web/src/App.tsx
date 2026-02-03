
import {
    HomeRoute,
    GlobalModalsProvider,
    ScriptEditorRoute,
    ScriptListRoute,
    ScriptSettingsRoute,
} from '@stagistic/app-routes';
import {LoaderOverlay, ToastProvider} from '@stagistic/ui';
import {useEffect, useState} from 'react';
import {
    Navigate, Route, Routes,
} from 'react-router-dom';

const App = () => {
    const [bootReady, setBootReady] = useState(false);
    const [bootProgress, setBootProgress] = useState(0);
    const [bootStatus, setBootStatus] = useState('Připravuji aplikaci');

    useEffect(() => {
        let isActive = true;

        const boot = async () => {
            setBootStatus('Načítám UI assety');
            if (document?.fonts?.ready) {
                await document.fonts.ready;
            }
            if (!isActive) return;

            setBootProgress(1);
            setBootStatus('Hotovo');
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
                title="Inicializuji Stagistic"
                subtitle={bootStatus}
                progress={bootProgress}
                hint="Prosím vyčkejte, připravujeme prostředí."
            />
        );
    }

    return (
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
    );
};

export default App;
