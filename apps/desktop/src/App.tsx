import {ScriptRepositoryProvider} from '@stagistic/app-core';
import {GlobalModalsProvider} from '@stagistic/app-routes';
import {
    LoaderOverlay,
    ToastProvider,
} from '@stagistic/ui';
import {
    lazy,
    Suspense,
} from 'react';
import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from 'react-router-dom';

import {scriptRepository} from '~repo';

import {DesktopMenuEventHandler} from './components/DesktopMenuEventHandler';
import {useDesktopBootstrap} from './hooks/useDesktopBootstrap';

const HomeRoute = lazy(async () => {
    const module = await import('@stagistic/app-routes');

    return {
        default: module.HomeRoute,
    };
});

const ScriptListRoute = lazy(async () => {
    const module = await import('@stagistic/app-routes');

    return {
        default: module.ScriptListRoute,
    };
});

const ScriptEditorRoute = lazy(async () => {
    const module = await import('@stagistic/app-routes');

    return {
        default: module.ScriptEditorRoute,
    };
});

const ScriptSettingsRoute = lazy(async () => {
    const module = await import('@stagistic/app-routes');

    return {
        default: module.ScriptSettingsRoute,
    };
});

const App = () => {
    const {
        bootError,
        bootProgress,
        bootReady,
        bootStatus,
    } = useDesktopBootstrap();

    if (!bootReady) {
        return (
            <LoaderOverlay
                title="Inicializuji Stagistic"
                subtitle={bootStatus}
                progress={bootProgress}
                hint={bootError ?? 'Prosím vyčkejte, připravujeme pracovní prostředí.'}
            />
        );
    }

    return (
        <BrowserRouter>
            <ScriptRepositoryProvider repository={scriptRepository}>
                <ToastProvider>
                    <GlobalModalsProvider>
                        <DesktopMenuEventHandler />
                        <Suspense
                            fallback={(
                                <LoaderOverlay
                                    title="Načítám obrazovku"
                                    subtitle="Připravuji routu"
                                    hint="Prosím vyčkejte"
                                />
                            )}
                        >
                            <Routes>
                                <Route path="/" element={<HomeRoute />} />
                                <Route path="/script/list" element={<ScriptListRoute />} />
                                <Route path="/script/:scriptId/editor" element={<ScriptEditorRoute />} />
                                <Route path="/script/:scriptId/settings" element={<ScriptSettingsRoute />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </Suspense>
                    </GlobalModalsProvider>
                </ToastProvider>
            </ScriptRepositoryProvider>
        </BrowserRouter>
    );
};

export default App;
