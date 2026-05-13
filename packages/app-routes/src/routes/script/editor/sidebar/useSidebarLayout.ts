import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import type {SidebarPanelId} from './types';

const STORAGE_KEY = 'stagistic.editor.sidebar-layout';
const OVERLAY_BREAKPOINT_QUERY = '(max-width: 1100px)';

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

const getIsOverlayViewport = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }

    return window.matchMedia(OVERLAY_BREAKPOINT_QUERY).matches;
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
        const raw = window.localStorage.getItem(STORAGE_KEY);

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
    const [isOverlayViewport, setIsOverlayViewport] = useState(getIsOverlayViewport);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return;
        }

        const mediaQueryList = window.matchMedia(OVERLAY_BREAKPOINT_QUERY);
        const syncOverlayMode = () => {
            setIsOverlayViewport(mediaQueryList.matches);
        };

        syncOverlayMode();
        mediaQueryList.addEventListener('change', syncOverlayMode);

        return () => {
            mediaQueryList.removeEventListener('change', syncOverlayMode);
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
    }, [availablePanelIds, defaultLeftPanelId, defaultRightPanelId]);

    useEffect(() => {
        if (!isOverlayViewport) {
            return;
        }

        if (state.isLeftOpen && state.isRightOpen) {
            setState(previous => ({...previous, isLeftOpen: false}));
        }
    }, [
        isOverlayViewport,
        state.isLeftOpen,
        state.isRightOpen,
    ]);

    const toggleLeft = useCallback(() => {
        setState(previous => {
            const nextIsLeftOpen = !previous.isLeftOpen;

            return {
                ...previous,
                isLeftOpen: nextIsLeftOpen,
                isRightOpen: isOverlayViewport && nextIsLeftOpen
                    ? false
                    : previous.isRightOpen,
            };
        });
    }, [isOverlayViewport]);

    const toggleRight = useCallback(() => {
        setState(previous => {
            const nextIsRightOpen = !previous.isRightOpen;

            return {
                ...previous,
                isLeftOpen: isOverlayViewport && nextIsRightOpen
                    ? false
                    : previous.isLeftOpen,
                isRightOpen: nextIsRightOpen,
            };
        });
    }, [isOverlayViewport]);

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
