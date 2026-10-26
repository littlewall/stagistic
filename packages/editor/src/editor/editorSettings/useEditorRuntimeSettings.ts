import type {EditorSettingsOverride} from '@stagistic/script';
import {useMemo} from 'react';

type EditorRuntimeSettingsOverride = Omit<EditorSettingsOverride, 'initialPages'>;

/**
 * Keeps export-only settings out of the editor's runtime configuration.
 * Dependency fields are intentionally explicit: adding a persisted setting
 * does not invalidate the live editor until its canvas impact is classified.
 */
export const useEditorRuntimeSettings = (
    settings?: EditorSettingsOverride,
): EditorRuntimeSettingsOverride | undefined => {
    const {
        blocks,
        headerFooter,
        page,
        structure,
        typography,
        visual,
    } = settings ?? {};
    const hasSettings = settings !== undefined;

    return useMemo(() => hasSettings ? {
        blocks,
        headerFooter,
        page,
        structure,
        typography,
        visual,
    } : undefined, [
        blocks,
        hasSettings,
        headerFooter,
        page,
        structure,
        typography,
        visual,
    ]);
};
