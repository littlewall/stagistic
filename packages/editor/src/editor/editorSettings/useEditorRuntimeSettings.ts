import type {EditorSettingsOverride} from '@stagistic/script';
import {useMemo} from 'react';

type EditorRuntimeSettingsOverride = Omit<EditorSettingsOverride, 'initialPages'>;

const selectEditorRuntimeSettings = (
    settings: EditorSettingsOverride,
): EditorRuntimeSettingsOverride => ({
    page: settings.page,
    typography: settings.typography,
    visual: settings.visual,
    structure: settings.structure,
    headerFooter: settings.headerFooter,
    blocks: settings.blocks,
});

/**
 * Keeps export-only settings out of the editor's runtime configuration.
 * Dependency fields are intentionally explicit: adding a persisted setting
 * does not invalidate the live editor until its canvas impact is classified.
 */
export const useEditorRuntimeSettings = (
    settings?: EditorSettingsOverride,
): EditorRuntimeSettingsOverride | undefined => useMemo(
    () => settings ? selectEditorRuntimeSettings(settings) : undefined,
    [
        settings?.blocks,
        settings?.headerFooter,
        settings?.page,
        settings?.structure,
        settings?.typography,
        settings?.visual,
    ],
);
