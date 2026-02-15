import {BLOCK_ICONS} from '@stagistic/editor-ui';
import {
    FOUNTAIN_BLOCK_ITEMS,
    type FountainElementType,
} from '@stagistic/script-core';
import type {SettingsNavGroup} from '@stagistic/ui';

export const SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO = 'document-info';
export const SCRIPT_SETTINGS_PANEL_VISUAL_PREFERENCES = 'visual-preferences';
export const SCRIPT_SETTINGS_PANEL_PRODUCTION = 'production';
export const SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT = 'page-layout';
export const SCRIPT_SETTINGS_PANEL_HEADERS = 'headers-footers';
export const SCRIPT_SETTINGS_PANEL_STATUSES = 'document-statuses';
export const SCRIPT_SETTINGS_PANEL_NOTES = 'notes';
export const SCRIPT_SETTINGS_PANEL_PROJECT_STATUSES = 'project-statuses';

export const SCRIPT_SETTINGS_EXPANDABLE_ELEMENTS = 'elements-settings';

const SCRIPT_SETTINGS_PANEL_ELEMENT_PREFIX = 'element-settings:';

export const SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS: Array<{
    id: string,
    blockType: FountainElementType,
    label: string,
}> = FOUNTAIN_BLOCK_ITEMS.map(item => ({
    id: item.id,
    blockType: item.type,
    label: item.label,
}));

export type ElementSettingsPanelId = `${typeof SCRIPT_SETTINGS_PANEL_ELEMENT_PREFIX}${FountainElementType}`;

export const getElementSettingsPanelId = (
    blockType: FountainElementType,
): ElementSettingsPanelId => `${SCRIPT_SETTINGS_PANEL_ELEMENT_PREFIX}${blockType}`;

const ELEMENT_SETTINGS_PANEL_IDS = new Set(
    SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS.map(item => getElementSettingsPanelId(item.blockType)),
);
const ELEMENT_BLOCK_TYPE_SET = new Set(
    SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS.map(item => item.blockType),
);

export const isElementSettingsPanelId = (
    panelId: string,
): panelId is ElementSettingsPanelId => ELEMENT_SETTINGS_PANEL_IDS.has(panelId as ElementSettingsPanelId);
export const getBlockTypeFromElementPanelId = (panelId: string): FountainElementType | null => {
    if (!isElementSettingsPanelId(panelId)) {
        return null;
    }

    const blockType = panelId.slice(SCRIPT_SETTINGS_PANEL_ELEMENT_PREFIX.length);

    return ELEMENT_BLOCK_TYPE_SET.has(blockType as FountainElementType)
        ? blockType as FountainElementType
        : null;
};

export type ScriptSettingsPanelId =
    | typeof SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO
    | typeof SCRIPT_SETTINGS_PANEL_VISUAL_PREFERENCES
    | typeof SCRIPT_SETTINGS_PANEL_PRODUCTION
    | typeof SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT
    | typeof SCRIPT_SETTINGS_PANEL_HEADERS
    | typeof SCRIPT_SETTINGS_PANEL_STATUSES
    | typeof SCRIPT_SETTINGS_PANEL_NOTES
    | typeof SCRIPT_SETTINGS_PANEL_PROJECT_STATUSES
    | ElementSettingsPanelId;

export const scriptSettingsMenu: SettingsNavGroup[] = [
    {
        id: 'script',
        label: 'Script',
        items: [
            {
                kind: 'item',
                id: 'document-info',
                label: 'Script Info',
                panelId: SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO,
            },
            {
                kind: 'item',
                id: 'visual-preferences',
                label: 'Visual Preferences',
                panelId: SCRIPT_SETTINGS_PANEL_VISUAL_PREFERENCES,
            },
            {
                kind: 'item',
                id: 'production',
                label: 'Production',
                panelId: SCRIPT_SETTINGS_PANEL_PRODUCTION,
            },
            {
                kind: 'item',
                id: 'page-layout',
                label: 'Page Layout',
                panelId: SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT,
            },
            {
                kind: 'item',
                id: 'headers-footers',
                label: 'Headers and Footers',
                panelId: SCRIPT_SETTINGS_PANEL_HEADERS,
            },
            {
                kind: 'item',
                id: 'document-statuses',
                label: 'Statuses',
                panelId: SCRIPT_SETTINGS_PANEL_STATUSES,
            },
            {
                kind: 'item',
                id: 'notes',
                label: 'Notes',
                panelId: SCRIPT_SETTINGS_PANEL_NOTES,
            },
            {
                kind: 'expandable',
                id: SCRIPT_SETTINGS_EXPANDABLE_ELEMENTS,
                label: 'Elements settings',
                subItems: SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS.map(item => ({
                    id: item.id,
                    label: item.label,
                    panelId: getElementSettingsPanelId(item.blockType),
                    icon: BLOCK_ICONS[item.blockType],
                })),
            },
        ],
    },
    {
        id: 'project',
        label: 'Project',
        items: [
            {
                kind: 'item',
                id: 'project-statuses',
                label: 'Statuses',
                panelId: SCRIPT_SETTINGS_PANEL_PROJECT_STATUSES,
            },
        ],
    },
];
