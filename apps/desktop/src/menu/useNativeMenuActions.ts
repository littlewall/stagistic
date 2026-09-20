import {useGlobalModals} from '@stagistic/app-routes';
import {listen} from '@tauri-apps/api/event';
import {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';

// Native menu items emit `menu-action` from the Rust side (see src-tauri/src/main.rs).
const MENU_EVENT = 'menu-action';

type MenuAction = 'open-script' | 'new-script' | 'import-script';

// Bridges the native macOS menu to the shared app: File ▸ New/Import open the
// global modals, File ▸ Open returns to the script list.
export const useNativeMenuActions = (): void => {
    const {openNewScript, openImportScript} = useGlobalModals();
    const navigate = useNavigate();

    useEffect(() => {
        const unlisten = listen<MenuAction>(MENU_EVENT, event => {
            switch (event.payload) {
                case 'new-script':
                    openNewScript();
                    break;
                case 'import-script':
                    openImportScript();
                    break;
                case 'open-script':
                    void navigate('/');
                    break;
                default:
                    break;
            }
        });

        return () => {
            void unlisten.then(dispose => dispose());
        };
    }, [openNewScript, openImportScript, navigate]);
};
