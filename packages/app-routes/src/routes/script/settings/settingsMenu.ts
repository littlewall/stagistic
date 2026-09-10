import {BLOCK_ICONS} from '@stagistic/editor';
import {
    BLOCK_ITEMS,
    type ScriptBlockNodeType,
} from '@stagistic/script';
import type {SettingsNavGroup} from '@stagistic/ui';

export const SETTINGS_MODAL_QUERY_KEY = 'settingsModal';
export const SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO = 'document-info';
export const SCRIPT_SETTINGS_PANEL_INITIAL_PAGES = 'initial-pages';
export const SCRIPT_SETTINGS_PANEL_VISUAL_PREFERENCES = 'visual-preferences';
export const SCRIPT_SETTINGS_PANEL_STRUCTURE_MARKERS = 'structure-markers';
export const SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT = 'page-layout';
export const SCRIPT_SETTINGS_PANEL_HEADERS = 'headers-footers';
export const SCRIPT_SETTINGS_PANEL_DANGER_ZONE = 'danger-zone';

export const SCRIPT_SETTINGS_EXPANDABLE_ELEMENTS = 'elements-settings';

const SCRIPT_SETTINGS_PANEL_ELEMENT_PREFIX = 'element-settings:';

const rawBlockItems = BLOCK_ITEMS.map(item => ({
    id: item.id,
    blockType: item.nodeType,
    label: item.label,
}));

export const SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS: Array<{
    id: string,
    blockType: ScriptBlockNodeType,
    label: string,
}> = [...rawBlockItems.filter(item => item.blockType === 'act'), ...rawBlockItems.filter(item => item.blockType !== 'act')];

export type ElementSettingsPanelId = `${typeof SCRIPT_SETTINGS_PANEL_ELEMENT_PREFIX}${ScriptBlockNodeType}`;

export const getElementSettingsPanelId = (
    blockType: ScriptBlockNodeType,
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
export const getBlockTypeFromElementPanelId = (panelId: string): ScriptBlockNodeType | null => {
    if (!isElementSettingsPanelId(panelId)) {
        return null;
    }

    const blockType = panelId.slice(SCRIPT_SETTINGS_PANEL_ELEMENT_PREFIX.length);

    return ELEMENT_BLOCK_TYPE_SET.has(blockType as ScriptBlockNodeType)
        ? blockType as ScriptBlockNodeType
        : null;
};

export type ScriptSettingsPanelId =
    | typeof SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO
    | typeof SCRIPT_SETTINGS_PANEL_INITIAL_PAGES
    | typeof SCRIPT_SETTINGS_PANEL_VISUAL_PREFERENCES
    | typeof SCRIPT_SETTINGS_PANEL_STRUCTURE_MARKERS
    | typeof SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT
    | typeof SCRIPT_SETTINGS_PANEL_HEADERS
    | typeof SCRIPT_SETTINGS_PANEL_DANGER_ZONE
    | ElementSettingsPanelId;

export const scriptSettingsMenu: SettingsNavGroup[] = [
    {
        id: 'script',
        label: 'Script',
        items: [
            {
                kind: 'item',
                id: SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO,
                label: 'Title page',
                panelId: SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO,
            },
            {
                kind: 'item',
                id: SCRIPT_SETTINGS_PANEL_INITIAL_PAGES,
                label: 'Initial pages',
                panelId: SCRIPT_SETTINGS_PANEL_INITIAL_PAGES,
            },
            {
                kind: 'item',
                id: SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT,
                label: 'Page layout',
                panelId: SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT,
            },
            {
                kind: 'item',
                id: SCRIPT_SETTINGS_PANEL_HEADERS,
                label: 'Header and footer',
                panelId: SCRIPT_SETTINGS_PANEL_HEADERS,
            },
            {
                kind: 'item',
                id: SCRIPT_SETTINGS_PANEL_VISUAL_PREFERENCES,
                label: 'Visual preferences',
                panelId: SCRIPT_SETTINGS_PANEL_VISUAL_PREFERENCES,
            },
            {
                kind: 'expandable',
                id: SCRIPT_SETTINGS_EXPANDABLE_ELEMENTS,
                label: 'Block settings',
                subItems: SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS.map(item => ({
                    id: item.id,
                    label: item.label,
                    panelId: getElementSettingsPanelId(item.blockType),
                    icon: BLOCK_ICONS[item.blockType],
                })),
            },
            {
                kind: 'separator',
                id: 'danger-zone-separator',
            },
            {
                kind: 'item',
                id: SCRIPT_SETTINGS_PANEL_DANGER_ZONE,
                label: 'Danger zone',
                panelId: SCRIPT_SETTINGS_PANEL_DANGER_ZONE,
            },
        ],
    },
];
