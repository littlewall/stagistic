import {
    DEFAULT_EDITOR_SETTINGS,
    type EditorSettingsOverride,
    mergeEditorSettings,
} from '@stagistic/script';

/* The script's scene casing as the Editor renders it: a CSS text-transform. The text itself stays as typed. */
export const getSceneTextTransform = (scriptSettings: EditorSettingsOverride | null | undefined): 'uppercase' | 'lowercase' | 'none' => {
    const casing = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, scriptSettings).blocks.scene?.casing;

    if (casing === 'normal') return 'none';

    return casing === 'lowercase' ? 'lowercase' : 'uppercase';
};
