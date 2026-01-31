import {listen, type UnlistenFn} from '@tauri-apps/api/event';
import {useEffect} from 'react';
import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
    useNavigate,
} from 'react-router-dom';

import {ToastProvider} from '~components/ToastProvider';
import {
    MENU_EVENT_IMPORT_SCRIPT,
    MENU_EVENT_NEW_SCRIPT,
} from '~constants/menuEvents';
import {HomeRoute} from '~routes/home/HomeRoute';
import {ScriptEditorRoute} from '~routes/script/ScriptEditorRoute';
import {ScriptListRoute} from '~routes/script/ScriptListRoute';
import {ScriptSettingsRoute} from '~routes/script/ScriptSettingsRoute';

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
    return (
        <BrowserRouter>
            <ToastProvider>
                <MenuEventHandler />
                <Routes>
                    <Route path="/" element={<HomeRoute />} />
                    <Route path="/script/list" element={<ScriptListRoute />} />
                    <Route path="/script/:scriptId/editor" element={<ScriptEditorRoute />} />
                    <Route path="/script/:scriptId/settings" element={<ScriptSettingsRoute />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </ToastProvider>
        </BrowserRouter>
    );
};

export default App;
