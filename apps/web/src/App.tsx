
import {
    HomeRoute,
    GlobalModalsProvider,
    ScriptEditorRoute,
    ScriptListRoute,
    ScriptSettingsRoute,
} from '@stagistic/app-routes';
import {ToastProvider} from '@stagistic/ui';
import {useEffect, useState} from 'react';
import {
    Navigate, Route, Routes,
} from 'react-router-dom';

import {LoaderOverlay} from '../../packages/ui/src/LoaderOverlay';

const App = () => {
    // Simulace globálního načítání (např. při mountu, refreshi, delším fetchi)
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulace načítání (např. fetchování dat, inicializace)
        const timeout = setTimeout(() => setLoading(false), 1200); // 1.2s loader

        return () => clearTimeout(timeout);
    }, []);

    return (
        <ToastProvider>
            <GlobalModalsProvider>
                {loading && <LoaderOverlay />}
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
