import {useCallback, useState} from 'react';

import {SIDEBAR_PREFERENCES_STORAGE_KEY} from '../../../../shared/storageKeys';
import type {SidebarPanelId} from './types';

/*
 * Where a panel preference lives:
 * - 'global': a working habit (e.g. a view mode), shared by every script;
 * - {script}: tied to one script's content (e.g. a filter), so another script starts from the default.
 */
export type SidebarPreferenceScope = 'global' | {script: string};

interface UseSidebarPreferenceArgs<T> {
    panelId: SidebarPanelId,
    name: string,
    scope: SidebarPreferenceScope,
    defaultValue: T,
    /** Validates the stored value; undefined falls back to the default (stale or foreign data). */
    parse: (value: unknown) => T | undefined,
}

export const getSidebarPreferenceKey = (panelId: SidebarPanelId, name: string, scope: SidebarPreferenceScope) => {
    const suffix = scope === 'global' ? 'global' : `script:${scope.script}`;

    return `${SIDEBAR_PREFERENCES_STORAGE_KEY}:${panelId}:${name}:${suffix}`;
};

const readPreference = <T>(key: string, parse: (value: unknown) => T | undefined): T | undefined => {
    try {
        const raw = window.localStorage.getItem(key);

        return raw === null ? undefined : parse(JSON.parse(raw));
    } catch {
        return undefined;
    }
};

const writePreference = (key: string, value: unknown) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore storage write failures in constrained environments.
    }
};

/** useState for one sidebar panel preference, persisted in localStorage under its scope. */
export const useSidebarPreference = <T>({
    panelId,
    name,
    scope,
    defaultValue,
    parse,
}: UseSidebarPreferenceArgs<T>) => {
    const key = getSidebarPreferenceKey(panelId, name, scope);
    const [entry, setEntry] = useState(() => ({key, value: readPreference(key, parse) ?? defaultValue}));
    let {value} = entry;

    // Switching scripts swaps the key; re-read during render so the old script's value never shows.
    if (entry.key !== key) {
        value = readPreference(key, parse) ?? defaultValue;
        setEntry({key, value});
    }

    const setValue = useCallback(
        (next: T) => {
            setEntry({key, value: next});
            writePreference(key, next);
        },
        [key],
    );

    return [value, setValue] as const;
};
