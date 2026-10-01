import type {EditorSettings} from '@stagistic/script';

/*
 * Settings baked into editor extensions; changing them rebuilds the editor.
 * `visual` is CSS-only (root data attribute), so it never forces a rebuild.
 */
export const selectEditorRebuildSettings = (
    settings: EditorSettings,
): Pick<EditorSettings, 'blocks' | 'structure'> => ({
    blocks: settings.blocks,
    structure: settings.structure,
});
