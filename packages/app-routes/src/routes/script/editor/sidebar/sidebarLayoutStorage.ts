import {SIDEBAR_LAYOUT_STORAGE_KEY} from '../../../../shared/storageKeys';
import type {SidebarPanelId} from './types';

export type OverlayDrawer = 'left' | 'right' | null;

export interface SidebarLayoutState {
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

export const getIsMatchingViewport = (query: string) => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }

    return window.matchMedia(query).matches;
};

const isStoredSidebarLayoutState = (value: unknown): value is StoredSidebarLayoutState => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
        (candidate.isLeftOpen === undefined || typeof candidate.isLeftOpen === 'boolean') &&
        (candidate.isRightOpen === undefined || typeof candidate.isRightOpen === 'boolean') &&
        (candidate.leftPanelId === undefined || typeof candidate.leftPanelId === 'string') &&
        (candidate.rightPanelId === undefined || typeof candidate.rightPanelId === 'string')
    );
};

export const getStorageKey = (storageScope: string) => {
    return `${SIDEBAR_LAYOUT_STORAGE_KEY}:${storageScope}`;
};

const readStored = (storageScope: string): StoredSidebarLayoutState | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(getStorageKey(storageScope));

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

export const resolvePanelId = (stored: SidebarPanelId | undefined, fallback: SidebarPanelId, available: readonly SidebarPanelId[]): SidebarPanelId => {
    if (stored && available.includes(stored)) {
        return stored;
    }

    return fallback;
};

export const createInitialState = (
    storageScope: string,
    defaultLeftPanelId: SidebarPanelId,
    defaultRightPanelId: SidebarPanelId,
    availablePanelIds: readonly SidebarPanelId[],
): SidebarLayoutState => {
    const stored = readStored(storageScope);

    return {
        isLeftOpen: stored?.isLeftOpen ?? true,
        isRightOpen: stored?.isRightOpen ?? true,
        leftPanelId: resolvePanelId(stored?.leftPanelId, defaultLeftPanelId, availablePanelIds),
        rightPanelId: resolvePanelId(stored?.rightPanelId, defaultRightPanelId, availablePanelIds),
    };
};
