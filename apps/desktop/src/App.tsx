import {
    MENU_EVENT_IMPORT_SCRIPT,
    MENU_EVENT_NEW_SCRIPT,
    ScriptRepositoryProvider,
} from '@stagistic/app-core';
import {
    GlobalModalsProvider,
    HomeRoute,
    ScriptEditorRoute,
    ScriptListRoute,
    ScriptSettingsRoute,
} from '@stagistic/app-routes';
import {
    LoaderOverlay,
    ToastProvider,
} from '@stagistic/ui';
import {listen, type UnlistenFn} from '@tauri-apps/api/event';
import {
    useEffect, useState,
} from 'react';
import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
    useNavigate,
} from 'react-router-dom';

import {prepareLocalDbWithProgress} from '~db';
import {scriptRepository} from '~repo';

const MenuEventHandler = () => {
    const navigate = useNavigate();

    useEffect(() => {
        let unlisten: UnlistenFn | null = null;
        let disposed = false;

        const setup = async () => {
            try {
                const stop = await listen<string>('menu-action', event => {
                    switch (event.payload) {
                        case 'open-script':
                            void navigate('/script/list');
                            break;
                        case 'new-script':
                            window.dispatchEvent(new CustomEvent(MENU_EVENT_NEW_SCRIPT));
                            break;
                        case 'import-script':
                            window.dispatchEvent(new CustomEvent(MENU_EVENT_IMPORT_SCRIPT));
                            break;
                        default:
                            break;
                    }
                });

                if (disposed) {
                    stop();

                    return;
                }

                unlisten = stop;
            } catch (error) {
                console.error('Failed to listen to menu events', error);
            }
        };

        void setup();

        return () => {
            disposed = true;
            if (unlisten) {
                unlisten();
            }
        };
    }, [navigate]);

    return null;
};

const App = () => {
    const [bootProgress, setBootProgress] = useState(0);
    const [bootError, setBootError] = useState<string | null>(null);
    const [bootReady, setBootReady] = useState(false);
    const [bootStatus, setBootStatus] = useState('Připravuji aplikaci');

    useEffect(() => {
        let isActive = true;

        const boot = async () => {
            try {
                setBootStatus('Načítám UI assety');
                if (document?.fonts?.ready) {
                    await document.fonts.ready;
                }

                if (!isActive) return;

                setBootProgress(0.15);

                await prepareLocalDbWithProgress(update => {
                    if (!isActive) return;
                    setBootStatus(update.label);
                    setBootProgress(0.15 + update.progress * 0.85);
                });

                if (!isActive) return;

                setBootProgress(1);
                setBootStatus('Hotovo');
                setBootReady(true);
            } catch (error) {
                console.error('Failed to initialize app', error);
                if (isActive) {
                    setBootError('Nepodařilo se inicializovat aplikaci.');
                }
            }
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
                hint={bootError ?? 'Prosím vyčkejte, připravujeme pracovní prostředí.'}
            />
        );
    }

    return (
        <BrowserRouter>
            <ScriptRepositoryProvider repository={scriptRepository}>
                <ToastProvider>
                    <GlobalModalsProvider>
                        <MenuEventHandler />
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
        </BrowserRouter>
    );
};

export default App;
