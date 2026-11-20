import {getRuntimeFileFailure, useDatabaseHandover} from '@stagistic/app-core';
import {hasUnsavedWork} from '@stagistic/shared';
import {
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
} from 'react';

import {reloadPage} from '../shared/reloadPage';
import {attemptQuietReload} from './quietReload';
import {createReleaseUpdateMonitor, type ReleaseUpdateMonitorOptions} from './releaseUpdateMonitor';

const QUIET_RELOAD_DELAY_MS = 1500;
const OPEN_DIALOG_SELECTOR = 'dialog[open], [role="dialog"], [role="alertdialog"], [role="menu"]';

interface ReleaseUpdate {
    /** The newer Release that is deployed, once one was found. */
    availableRelease: string | null,
    /** The database generation that deployed Release needs, once one was found. */
    availableDbGeneration: string | null,
    /** The database generation this tab is running. */
    dbGeneration: string,
    /** Reloads the page. Unsaved text still gets the browser's own prompt. */
    reload: () => void,
    getAvailableRelease: () => string | null,
    getAvailableDbGeneration: () => string | null,
    quietReloadDelayMs: number,
}

const ReleaseUpdateContext = createContext<ReleaseUpdate | null>(null);

/** Null where nothing watches for updates (desktop has no deployment), so callers can stay optional. */
export const useReleaseUpdate = () => useContext(ReleaseUpdateContext);

interface ReleaseUpdateProviderProps {
    children: ReactNode,
    currentRelease: string,
    /** This tab's database generation; a quiet reload needs the deployed one to match. */
    dbGeneration: string,
    /** Replaces the browser seams (fetch, focus, online state); keep it stable. */
    monitorOptions?: Omit<ReleaseUpdateMonitorOptions, 'currentRelease'>,
    reload?: () => void,
    quietReloadDelayMs?: number,
}

/** Web only: watches for a newer deployed Release. */
export const ReleaseUpdateProvider = ({
    children,
    currentRelease,
    dbGeneration,
    monitorOptions,
    reload = reloadPage,
    quietReloadDelayMs = QUIET_RELOAD_DELAY_MS,
}: ReleaseUpdateProviderProps) => {
    const [monitor] = useState(() => createReleaseUpdateMonitor({currentRelease, ...monitorOptions}));
    const availableRelease = useSyncExternalStore(monitor.subscribe, monitor.getAvailableRelease, () => null);
    const availableDbGeneration = useSyncExternalStore(monitor.subscribe, monitor.getAvailableDbGeneration, () => null);
    const value = useMemo<ReleaseUpdate>(() => ({
        availableRelease,
        availableDbGeneration,
        dbGeneration,
        reload,
        getAvailableRelease: monitor.getAvailableRelease,
        getAvailableDbGeneration: monitor.getAvailableDbGeneration,
        quietReloadDelayMs,
    }), [
        availableDbGeneration,
        availableRelease,
        dbGeneration,
        monitor,
        quietReloadDelayMs,
        reload,
    ]);

    useEffect(() => monitor.start(), [monitor]);

    return <ReleaseUpdateContext.Provider value={value}>{children}</ReleaseUpdateContext.Provider>;
};

const getSessionStorage = () => {
    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
};

/**
 * Reloads quietly when the writer comes back to the script list and a newer Release is known.
 * Mount it only on the script list. Only the Release known at that moment counts: one found while
 * the list is already open waits for the next return.
 */
export const useQuietReloadOnReturn = () => {
    const update = useReleaseUpdate();
    const handover = useDatabaseHandover();
    const [knownOnReturn] = useState(() => update?.getAvailableRelease() ?? null);
    const delay = update?.quietReloadDelayMs;
    const reload = update?.reload;
    const getAvailableRelease = update?.getAvailableRelease;
    const availableDbGeneration = update?.availableDbGeneration;
    const dbGeneration = update?.dbGeneration;

    useEffect(() => {
        if (!knownOnReturn || delay === undefined || !reload || !getAvailableRelease) {
            return undefined;
        }

        // A schema change (deployed generation differs) never quiet-reloads: the footer prompt only.
        if (availableDbGeneration !== dbGeneration) {
            return undefined;
        }

        // A little later than the return itself, so a save still finishing and the writer's first click settle; checked again then.
        const timer = setTimeout(() => {
            attemptQuietReload({
                release: getAvailableRelease() ?? knownOnReturn,
                conditions: {
                    hasUnsavedWork: hasUnsavedWork(),
                    hasOpenDialog: document.querySelector(OPEN_DIALOG_SELECTOR) !== null,
                    isHandoverIdle: !handover || handover.getState().status === 'idle',
                    hasRuntimeFileFailure: getRuntimeFileFailure() !== null,
                },
                storage: getSessionStorage(),
                reload,
            });
        }, delay);

        return () => clearTimeout(timer);
    }, [
        availableDbGeneration,
        dbGeneration,
        delay,
        getAvailableRelease,
        handover,
        knownOnReturn,
        reload,
    ]);
};
