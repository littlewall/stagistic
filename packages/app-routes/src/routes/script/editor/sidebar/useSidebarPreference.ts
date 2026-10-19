import {SIDEBAR_PREFERENCES_STORAGE_KEY} from '../../../../shared/storageKeys';
import {useLocalPreference} from '../../../../shared/useLocalPreference';
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

/** useState for one sidebar panel preference, persisted in localStorage under its scope. */
export const useSidebarPreference = <T>({
    panelId,
    name,
    scope,
    defaultValue,
    parse,
}: UseSidebarPreferenceArgs<T>) => useLocalPreference({
    key: getSidebarPreferenceKey(panelId, name, scope),
    defaultValue,
    parse,
});
