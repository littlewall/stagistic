import {
    DEFAULT_EDITOR_SETTINGS,
    DEFAULT_SCENE_NUMBER_FORMAT,
    type EditorSettingsOverride,
    mergeEditorSettings,
    type SceneNumberFormat,
} from '@stagistic/script';

/* The script's scene number format as the Editor renders it: "3." for dot, "3)" for paren, none hidden. */
export const getSceneNumberFormat = (scriptSettings: EditorSettingsOverride | null | undefined): SceneNumberFormat => {
    const format = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, scriptSettings).blocks.scene?.sceneNumberFormat;

    return format ?? DEFAULT_SCENE_NUMBER_FORMAT;
};
