import {createContext, useContext} from 'react';

import type {UpdateCheckResult, UpdateState} from './updateController';

export interface DesktopUpdates {
    state: UpdateState,
    checkNow: () => Promise<UpdateCheckResult>,
    /** Safe shutdown, then relaunch into the new Release, with the closing overlay. */
    restart: () => void,
    /** Manual check that ends in a dialog: up to date, ready with Restart, or failed. For the app menu. */
    checkForUpdatesWithDialog: () => Promise<void>,
}

const DesktopUpdatesContext = createContext<DesktopUpdates | null>(null);

export const DesktopUpdatesProvider = DesktopUpdatesContext.Provider;

export const useDesktopUpdates = (): DesktopUpdates => {
    const updates = useContext(DesktopUpdatesContext);

    if (!updates) {
        throw new Error('useDesktopUpdates must be used within DesktopUpdatesProvider');
    }

    return updates;
};
