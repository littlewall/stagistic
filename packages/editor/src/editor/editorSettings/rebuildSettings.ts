import type {EditorSettings} from '@stagistic/script';

export const selectEditorRebuildSettings = (
    settings: EditorSettings,
): Pick<EditorSettings, 'blocks' | 'structure' | 'visual'> => ({
    blocks: settings.blocks,
    structure: settings.structure,
    visual: settings.visual,
});
