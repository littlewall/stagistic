import type {FountainElementType} from '@stagistic/editor-core';
import type {EditorSettings} from '@stagistic/shared';

export type BlockSettingsPatch = Partial<EditorSettings['blocks'][FountainElementType]>;

export type UpdateBlockSettings = (
    blockType: FountainElementType,
    patch: BlockSettingsPatch,
) => void;

export type ScriptEditorSettingsPanelProps = {
    panelId: string,
    resolvedScriptSettings: EditorSettings,
    blockLabelByType: Map<FountainElementType, string>,
    shortcutPrefix: string,
    onUpdateBlockSettings: UpdateBlockSettings,
};

export type ElementSettingsPanelProps = {
    blockType: FountainElementType,
    blockLabel: string,
    resolvedScriptSettings: EditorSettings,
    shortcutPrefix: string,
    onUpdateBlockSettings: UpdateBlockSettings,
};
