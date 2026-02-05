import {
    DEFAULT_EDITOR_SETTINGS,
    type EditorSettings,
    type EditorSettingsOverride,
    mergeEditorSettings,
} from '@stagistic/shared';

export const resolveEditorSettings = (
    globalOverrides?: EditorSettingsOverride,
    scriptOverrides?: EditorSettingsOverride,
): EditorSettings => mergeEditorSettings(
    DEFAULT_EDITOR_SETTINGS,
    globalOverrides,
    scriptOverrides,
);
