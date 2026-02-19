import type {
    BlockSettingsPatch,
    EditorSettings,
    FountainElementType,
    StructureSettingsPatch,
} from '@stagistic/script-core';

export type {
    BlockSettingsPatch,
    StructureSettingsPatch,
};

export type UpdateBlockSettings = (
    blockType: FountainElementType,
    patch: BlockSettingsPatch,
) => void;

export interface ScriptEditorSettingsPanelProps {
    panelId: string,
    resolvedScriptSettings: EditorSettings,
    blockLabelByType: Map<FountainElementType, string>,
    shortcutPrefix: string,
    onUpdateBlockSettings: UpdateBlockSettings,
    onUpdateCharacterColorSaturation: (value: number) => void,
    onUpdateStructureSettings: (patch: StructureSettingsPatch) => void,
}

export interface ElementSettingsPanelProps {
    blockType: FountainElementType,
    blockLabel: string,
    resolvedScriptSettings: EditorSettings,
    shortcutPrefix: string,
    onUpdateBlockSettings: UpdateBlockSettings,
}
