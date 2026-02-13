import {
    ELEMENT_ACTION,
    ELEMENT_CENTERED,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
    type FountainElementType,
} from '@stagistic/editor-core';
import type {SettingsNavGroup} from '@stagistic/ui';

export const SCRIPT_SETTINGS_PANEL_SOURCE = 'settings-source';
export const SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO = 'document-info';
export const SCRIPT_SETTINGS_PANEL_PRODUCTION = 'production';
export const SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT = 'page-layout';
export const SCRIPT_SETTINGS_PANEL_HEADERS = 'headers-footers';
export const SCRIPT_SETTINGS_PANEL_STATUSES = 'document-statuses';
export const SCRIPT_SETTINGS_PANEL_NOTES = 'notes';
export const SCRIPT_SETTINGS_PANEL_ACCOUNT_WRITING = 'account-writing';
export const SCRIPT_SETTINGS_PANEL_ACCOUNT_PROFILE = 'account-profile';
export const SCRIPT_SETTINGS_PANEL_ACCOUNT_NOTIFICATIONS = 'account-notifications';
export const SCRIPT_SETTINGS_PANEL_ACCOUNT_SECURITY = 'account-security';
export const SCRIPT_SETTINGS_PANEL_ACCOUNT_BILLING = 'account-billing';
export const SCRIPT_SETTINGS_PANEL_ACCOUNT_AI = 'account-ai';
export const SCRIPT_SETTINGS_PANEL_PROJECT_STATUSES = 'project-statuses';

export const SCRIPT_SETTINGS_EXPANDABLE_ELEMENTS = 'elements-settings';

const SCRIPT_SETTINGS_PANEL_ELEMENT_PREFIX = 'element-settings:';

export const SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS: Array<{
    id: string,
    blockType: FountainElementType,
    label: string,
}> = [
    {
        id: 'element-scene-heading',
        blockType: ELEMENT_SCENE_HEADING,
        label: 'Scene heading',
    },
    {
        id: 'element-action',
        blockType: ELEMENT_ACTION,
        label: 'Action',
    },
    {
        id: 'element-character',
        blockType: ELEMENT_CHARACTER,
        label: 'Character',
    },
    {
        id: 'element-parenthetical',
        blockType: ELEMENT_PARENTHETICAL,
        label: 'Parenthetical',
    },
    {
        id: 'element-dialogue',
        blockType: ELEMENT_DIALOGUE,
        label: 'Dialogue',
    },
    {
        id: 'element-lyrics',
        blockType: ELEMENT_LYRICS,
        label: 'Lyrics',
    },
    {
        id: 'element-transition',
        blockType: ELEMENT_TRANSITION,
        label: 'Transition',
    },
    {
        id: 'element-dual-character',
        blockType: ELEMENT_DUAL_DIALOGUE_CHARACTER,
        label: 'Character (dual)',
    },
    {
        id: 'element-centered',
        blockType: ELEMENT_CENTERED,
        label: 'Centered text',
    },
];

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
    | typeof SCRIPT_SETTINGS_PANEL_SOURCE
    | typeof SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO
    | typeof SCRIPT_SETTINGS_PANEL_PRODUCTION
    | typeof SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT
    | typeof SCRIPT_SETTINGS_PANEL_HEADERS
    | typeof SCRIPT_SETTINGS_PANEL_STATUSES
    | typeof SCRIPT_SETTINGS_PANEL_NOTES
    | typeof SCRIPT_SETTINGS_PANEL_ACCOUNT_WRITING
    | typeof SCRIPT_SETTINGS_PANEL_ACCOUNT_PROFILE
    | typeof SCRIPT_SETTINGS_PANEL_ACCOUNT_NOTIFICATIONS
    | typeof SCRIPT_SETTINGS_PANEL_ACCOUNT_SECURITY
    | typeof SCRIPT_SETTINGS_PANEL_ACCOUNT_BILLING
    | typeof SCRIPT_SETTINGS_PANEL_ACCOUNT_AI
    | typeof SCRIPT_SETTINGS_PANEL_PROJECT_STATUSES
    | ElementSettingsPanelId;

export const scriptSettingsMenu: SettingsNavGroup[] = [
    {
        id: 'account',
        label: 'Account',
        items: [
            {
                kind: 'item',
                id: 'account-writing',
                label: 'Writing Preferences',
                panelId: SCRIPT_SETTINGS_PANEL_ACCOUNT_WRITING,
            },
            {
                kind: 'item',
                id: 'account-profile',
                label: 'Profile',
                panelId: SCRIPT_SETTINGS_PANEL_ACCOUNT_PROFILE,
            },
            {
                kind: 'item',
                id: 'account-notifications',
                label: 'Notifications',
                panelId: SCRIPT_SETTINGS_PANEL_ACCOUNT_NOTIFICATIONS,
            },
            {
                kind: 'item',
                id: 'account-security',
                label: 'Password & Security',
                panelId: SCRIPT_SETTINGS_PANEL_ACCOUNT_SECURITY,
            },
            {
                kind: 'item',
                id: 'account-billing',
                label: 'Billing',
                panelId: SCRIPT_SETTINGS_PANEL_ACCOUNT_BILLING,
            },
            {
                kind: 'item',
                id: 'account-ai',
                label: 'AI',
                panelId: SCRIPT_SETTINGS_PANEL_ACCOUNT_AI,
            },
        ],
    },
    {
        id: 'document',
        label: 'Document',
        items: [
            {
                kind: 'item',
                id: 'settings-source',
                label: 'Settings Source',
                panelId: SCRIPT_SETTINGS_PANEL_SOURCE,
            },
            {
                kind: 'item',
                id: 'document-info',
                label: 'Document Info',
                panelId: SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO,
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
