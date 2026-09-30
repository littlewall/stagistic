import {useCallback, useEffect, useRef, useState} from 'react';

import {createInitialState, getIsMatchingViewport, getStorageKey, resolvePanelId, type OverlayDrawer, type SidebarLayoutState} from './sidebarLayoutStorage';
import {SIDEBAR_EXCLUSIVE_QUERY, SIDEBAR_OVERLAY_QUERY} from './sidebarViewport';
import type {SidebarPanelId} from './types';

/*
 * Below the overlay breakpoint a sidebar stops being part of the layout and
 * floats above the script, so "open" means two different things:
 *
 * - docked (wide): a persisted layout preference — the canvas shrinks next to it;
 * - overlay (narrow): a transient drawer — it covers the ends of the lines.
 *
 * Persisting the drawer would mean arriving on a laptop with the script silently
 * covered, so overlay state is session-only and always starts closed. Only one
 * drawer can be open at a time (the overlay range is a subset of the exclusive
 * range), which is why it is a single slot rather than two booleans.
 */
interface UseSidebarLayoutArgs {
    availablePanelIds: readonly SidebarPanelId[];
    defaultLeftPanelId: SidebarPanelId;
    defaultRightPanelId: SidebarPanelId;
    storageScope: string;
}

export const useSidebarLayout = ({availablePanelIds, defaultLeftPanelId, defaultRightPanelId, storageScope}: UseSidebarLayoutArgs) => {
    const storageScopeRef = useRef(storageScope);
    const [state, setState] = useState<SidebarLayoutState>(() => createInitialState(storageScope, defaultLeftPanelId, defaultRightPanelId, availablePanelIds));
    const [isExclusiveViewport, setIsExclusiveViewport] = useState(() => getIsMatchingViewport(SIDEBAR_EXCLUSIVE_QUERY));
    const [isOverlayViewport, setIsOverlayViewport] = useState(() => getIsMatchingViewport(SIDEBAR_OVERLAY_QUERY));
    const [overlayDrawer, setOverlayDrawer] = useState<OverlayDrawer>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return;
        }

        const exclusiveQueryList = window.matchMedia(SIDEBAR_EXCLUSIVE_QUERY);
        const overlayQueryList = window.matchMedia(SIDEBAR_OVERLAY_QUERY);
        const syncViewportModes = () => {
            setIsExclusiveViewport(exclusiveQueryList.matches);
            setIsOverlayViewport(overlayQueryList.matches);
        };

        syncViewportModes();
        exclusiveQueryList.addEventListener('change', syncViewportModes);
        overlayQueryList.addEventListener('change', syncViewportModes);

        return () => {
            exclusiveQueryList.removeEventListener('change', syncViewportModes);
            overlayQueryList.removeEventListener('change', syncViewportModes);
        };
    }, []);

    // Leaving overlay mode retires the drawer, so returning to it starts closed.
    useEffect(() => {
        if (!isOverlayViewport) {
            setOverlayDrawer(null);
        }
    }, [isOverlayViewport]);

    useEffect(() => {
        if (typeof window === 'undefined' || storageScopeRef.current !== storageScope) {
            return;
        }

        try {
            window.localStorage.setItem(getStorageKey(storageScope), JSON.stringify(state));
        } catch {
            // Ignore storage write failures in constrained environments.
        }
    }, [state, storageScope]);

    useEffect(() => {
        if (storageScopeRef.current === storageScope) {
            return;
        }

        storageScopeRef.current = storageScope;
        setOverlayDrawer(null);
        setState(createInitialState(storageScope, defaultLeftPanelId, defaultRightPanelId, availablePanelIds));
    }, [availablePanelIds, defaultLeftPanelId, defaultRightPanelId, storageScope]);

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

    /*
     * Docked sidebars are mutually exclusive below the exclusive breakpoint.
     * Overlay mode enforces this through `overlayDrawer` instead, and must not
     * rewrite the persisted docked preference while the drawers are floating.
     */
    useEffect(() => {
        if (!isExclusiveViewport || isOverlayViewport) {
            return;
        }

        if (state.isLeftOpen && state.isRightOpen) {
            setState(previous => ({...previous, isLeftOpen: false}));
        }
    }, [isExclusiveViewport, isOverlayViewport, state.isLeftOpen, state.isRightOpen]);

    const toggleLeft = useCallback(() => {
        if (isOverlayViewport) {
            setOverlayDrawer(previous => {
                return previous === 'left' ? null : 'left';
            });

            return;
        }

        setState(previous => {
            const nextIsLeftOpen = !previous.isLeftOpen;

            return {
                ...previous,
                isLeftOpen: nextIsLeftOpen,
                isRightOpen: isExclusiveViewport && nextIsLeftOpen ? false : previous.isRightOpen,
            };
        });
    }, [isExclusiveViewport, isOverlayViewport]);

    const toggleRight = useCallback(() => {
        if (isOverlayViewport) {
            setOverlayDrawer(previous => {
                return previous === 'right' ? null : 'right';
            });

            return;
        }

        setState(previous => {
            const nextIsRightOpen = !previous.isRightOpen;

            return {
                ...previous,
                isLeftOpen: isExclusiveViewport && nextIsRightOpen ? false : previous.isLeftOpen,
                isRightOpen: nextIsRightOpen,
            };
        });
    }, [isExclusiveViewport, isOverlayViewport]);

    const selectLeft = useCallback((panelId: SidebarPanelId) => {
        setState(previous => ({...previous, leftPanelId: panelId}));
    }, []);

    const selectRight = useCallback((panelId: SidebarPanelId) => {
        setState(previous => ({...previous, rightPanelId: panelId}));
    }, []);

    return {
        isLeftOpen: isOverlayViewport ? overlayDrawer === 'left' : state.isLeftOpen,
        isRightOpen: isOverlayViewport ? overlayDrawer === 'right' : state.isRightOpen,
        leftPanelId: state.leftPanelId,
        rightPanelId: state.rightPanelId,
        toggleLeft,
        toggleRight,
        selectLeft,
        selectRight,
    };
};
