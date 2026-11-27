import {
    useGlobalModals,
    useRunScriptMenuCommand,
    useWhatsNew,
} from '@stagistic/app-routes';
import {listen} from '@tauri-apps/api/event';
import {useEffect, useMemo} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';

import {showBackupsFolder} from '../db/backupsFolder';
import {useDesktopUpdates} from '../lifecycle/updatesContext';
import {openExternalUrl} from '../links/externalLinks';
import {openThirdPartyLicenses} from '../links/licenses';
import {MENU_EVENT} from './menuActions';
import {isInScriptPath, reportMenuContext} from './menuContext';
import {createMenuHandlers, dispatchMenuAction} from './menuHandlers';
import {runHistoryCommand} from './undoRedo';

/*
 * Bridges the native macOS menu (see src-tauri/src/menu.rs) to the shared app and
 * tells Rust whether a script is open so the Script menu enables only there.
 */
export const useNativeMenuActions = (): void => {
    const {
        openNewScript,
        openImportScript,
        openAppSettings,
    } = useGlobalModals();
    const {open: openWhatsNew} = useWhatsNew();
    const {checkForUpdatesWithDialog} = useDesktopUpdates();
    const runScriptCommand = useRunScriptMenuCommand();
    const navigate = useNavigate();
    const {pathname} = useLocation();
    const inScript = isInScriptPath(pathname);

    const handlers = useMemo(() => createMenuHandlers({
        checkForUpdates: checkForUpdatesWithDialog,
        openSettings: () => openAppSettings(),
        openNewScript: () => openNewScript(),
        openImportScript: () => openImportScript(),
        openScriptLibrary: () => navigate('/'),
        runHistory: runHistoryCommand,
        runScriptCommand,
        openWhatsNew,
        openExternal: openExternalUrl,
        showBackupsFolder,
        openLicenses: openThirdPartyLicenses,
    }), [
        checkForUpdatesWithDialog,
        openAppSettings,
        openNewScript,
        openImportScript,
        navigate,
        runScriptCommand,
        openWhatsNew,
    ]);

    useEffect(() => {
        const unlisten = listen<unknown>(MENU_EVENT, event => dispatchMenuAction(event.payload, handlers));

        return () => {
            void unlisten.then(dispose => dispose());
        };
    }, [handlers]);

    useEffect(() => {
        void reportMenuContext(inScript).catch(() => undefined);
    }, [inScript]);
};
