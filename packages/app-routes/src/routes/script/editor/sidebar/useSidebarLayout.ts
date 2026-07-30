import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {SIDEBAR_LAYOUT_STORAGE_KEY} from '../../../../storageKeys';
import {SIDEBAR_EXCLUSIVE_QUERY} from './sidebarViewport';
import type {SidebarPanelId} from './types';

interface SidebarLayoutState {
    isLeftOpen: boolean,
    isRightOpen: boolean,
    leftPanelId: SidebarPanelId,
    rightPanelId: SidebarPanelId,
}

interface StoredSidebarLayoutState {
    isLeftOpen?: boolean,
    isRightOpen?: boolean,
    leftPanelId?: SidebarPanelId,
    rightPanelId?: SidebarPanelId,
}

interface UseSidebarLayoutArgs {
    availablePanelIds: readonly SidebarPanelId[],
    defaultLeftPanelId: SidebarPanelId,
    defaultRightPanelId: SidebarPanelId,
}

const getIsExclusiveViewport = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }

    return window.matchMedia(SIDEBAR_EXCLUSIVE_QUERY).matches;
};

const isStoredSidebarLayoutState = (value: unknown): value is StoredSidebarLayoutState => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
        (candidate.isLeftOpen === undefined || typeof candidate.isLeftOpen === 'boolean')
        && (candidate.isRightOpen === undefined || typeof candidate.isRightOpen === 'boolean')
        && (candidate.leftPanelId === undefined || typeof candidate.leftPanelId === 'string')
        && (candidate.rightPanelId === undefined || typeof candidate.rightPanelId === 'string')
    );
};

const readStored = (): StoredSidebarLayoutState | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(SIDEBAR_LAYOUT_STORAGE_KEY);

        if (!raw) {
            return null;
        }

        const parsed: unknown = JSON.parse(raw);

        if (!isStoredSidebarLayoutState(parsed)) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
};

const resolvePanelId = (
    stored: SidebarPanelId | undefined,
    fallback: SidebarPanelId,
    available: readonly SidebarPanelId[],
): SidebarPanelId => {
    if (stored && available.includes(stored)) {
        return stored;
    }

    return fallback;
};

export const useSidebarLayout = ({
    availablePanelIds,
    defaultLeftPanelId,
    defaultRightPanelId,
}: UseSidebarLayoutArgs) => {
    const [state, setState] = useState<SidebarLayoutState>(() => {
        const stored = readStored();

        return {
            isLeftOpen: stored?.isLeftOpen ?? false,
            isRightOpen: stored?.isRightOpen ?? false,
            leftPanelId: resolvePanelId(stored?.leftPanelId, defaultLeftPanelId, availablePanelIds),
            rightPanelId: resolvePanelId(stored?.rightPanelId, defaultRightPanelId, availablePanelIds),
        };
    });
    const [isExclusiveViewport, setIsExclusiveViewport] = useState(getIsExclusiveViewport);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return;
        }

        const mediaQueryList = window.matchMedia(SIDEBAR_EXCLUSIVE_QUERY);
        const syncExclusiveMode = () => {
            setIsExclusiveViewport(mediaQueryList.matches);
        };

        syncExclusiveMode();
        mediaQueryList.addEventListener('change', syncExclusiveMode);

        return () => {
            mediaQueryList.removeEventListener('change', syncExclusiveMode);
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            window.localStorage.setItem(SIDEBAR_LAYOUT_STORAGE_KEY, JSON.stringify(state));
        } catch {
            // Ignore storage write failures in constrained environments.
        }
    }, [state]);

    // Reconcile state when the set of available panels changes.
    useEffect(() => {
        setState(previous => {
            const nextLeft = resolvePanelId(previous.leftPanelId, defaultLeftPanelId, availablePanelIds);
            const nextRight = resolvePanelId(previous.rightPanelId, defaultRightPanelId, availablePanelIds);

            if (nextLeft === previous.leftPanelId && nextRight === previous.rightPanelId) {
                return previous;
            }

            return {
                ...previous,
                leftPanelId: nextLeft,
                rightPanelId: nextRight,
            };
        });
    }, [
        availablePanelIds,
        defaultLeftPanelId,
        defaultRightPanelId,
    ]);

    useEffect(() => {
        if (!isExclusiveViewport) {
            return;
        }

        if (state.isLeftOpen && state.isRightOpen) {
            setState(previous => ({...previous, isLeftOpen: false}));
        }
    }, [
        isExclusiveViewport,
        state.isLeftOpen,
        state.isRightOpen,
    ]);

    const toggleLeft = useCallback(() => {
        setState(previous => {
            const nextIsLeftOpen = !previous.isLeftOpen;

            return {
                ...previous,
                isLeftOpen: nextIsLeftOpen,
                isRightOpen: isExclusiveViewport && nextIsLeftOpen
                    ? false
                    : previous.isRightOpen,
            };
        });
    }, [isExclusiveViewport]);

    const toggleRight = useCallback(() => {
        setState(previous => {
            const nextIsRightOpen = !previous.isRightOpen;

            return {
                ...previous,
                isLeftOpen: isExclusiveViewport && nextIsRightOpen
                    ? false
                    : previous.isLeftOpen,
                isRightOpen: nextIsRightOpen,
            };
        });
    }, [isExclusiveViewport]);

    const selectLeft = useCallback((panelId: SidebarPanelId) => {
        setState(previous => ({...previous, leftPanelId: panelId}));
    }, []);

    const selectRight = useCallback((panelId: SidebarPanelId) => {
        setState(previous => ({...previous, rightPanelId: panelId}));
    }, []);

    return {
        isLeftOpen: state.isLeftOpen,
        isRightOpen: state.isRightOpen,
        leftPanelId: state.leftPanelId,
        rightPanelId: state.rightPanelId,
        toggleLeft,
        toggleRight,
        selectLeft,
        selectRight,
    };
};
