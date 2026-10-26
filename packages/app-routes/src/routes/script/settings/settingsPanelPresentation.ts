import {
    SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS,
    SCRIPT_SETTINGS_PANEL_DANGER_ZONE,
    SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO,
    type ScriptSettingsPanelId,
} from './settingsMenu';

export const BLOCK_LABEL_BY_TYPE = new Map(SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS.map(item => [item.blockType, item.label] as const));

// Saved states have no danger zone; a link to it opens document info instead.
export const getShownSettingsPanelId = (panelId: ScriptSettingsPanelId, isReadOnly: boolean) => isReadOnly && panelId === SCRIPT_SETTINGS_PANEL_DANGER_ZONE
    ? SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO
    : panelId;
