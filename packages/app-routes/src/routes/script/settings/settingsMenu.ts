import type {SettingsNavGroup} from '@stagistic/ui';

export const SCRIPT_SETTINGS_PANEL_SOURCE = 'settings-source';
export const SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO = 'document-info';
export const SCRIPT_SETTINGS_PANEL_PRODUCTION = 'production';
export const SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT = 'page-layout';
export const SCRIPT_SETTINGS_PANEL_HEADERS = 'headers-footers';
export const SCRIPT_SETTINGS_PANEL_STATUSES = 'document-statuses';
export const SCRIPT_SETTINGS_PANEL_NOTES = 'notes';
export const SCRIPT_SETTINGS_PANEL_ELEMENT_STYLE = 'elements-style';
export const SCRIPT_SETTINGS_PANEL_ELEMENT_VISIBILITY = 'elements-visibility';
export const SCRIPT_SETTINGS_PANEL_ACCOUNT_WRITING = 'account-writing';
export const SCRIPT_SETTINGS_PANEL_ACCOUNT_PROFILE = 'account-profile';
export const SCRIPT_SETTINGS_PANEL_ACCOUNT_NOTIFICATIONS = 'account-notifications';
export const SCRIPT_SETTINGS_PANEL_ACCOUNT_SECURITY = 'account-security';
export const SCRIPT_SETTINGS_PANEL_ACCOUNT_BILLING = 'account-billing';
export const SCRIPT_SETTINGS_PANEL_ACCOUNT_AI = 'account-ai';
export const SCRIPT_SETTINGS_PANEL_PROJECT_STATUSES = 'project-statuses';

export type ScriptSettingsPanelId =
    | typeof SCRIPT_SETTINGS_PANEL_SOURCE
    | typeof SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO
    | typeof SCRIPT_SETTINGS_PANEL_PRODUCTION
    | typeof SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT
    | typeof SCRIPT_SETTINGS_PANEL_HEADERS
    | typeof SCRIPT_SETTINGS_PANEL_STATUSES
    | typeof SCRIPT_SETTINGS_PANEL_NOTES
    | typeof SCRIPT_SETTINGS_PANEL_ELEMENT_STYLE
    | typeof SCRIPT_SETTINGS_PANEL_ELEMENT_VISIBILITY
    | typeof SCRIPT_SETTINGS_PANEL_ACCOUNT_WRITING
    | typeof SCRIPT_SETTINGS_PANEL_ACCOUNT_PROFILE
    | typeof SCRIPT_SETTINGS_PANEL_ACCOUNT_NOTIFICATIONS
    | typeof SCRIPT_SETTINGS_PANEL_ACCOUNT_SECURITY
    | typeof SCRIPT_SETTINGS_PANEL_ACCOUNT_BILLING
    | typeof SCRIPT_SETTINGS_PANEL_ACCOUNT_AI
    | typeof SCRIPT_SETTINGS_PANEL_PROJECT_STATUSES;

export const SCRIPT_SETTINGS_EXPANDABLE_ELEMENTS = 'elements-settings';

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
                subItems: [
                    {
                        id: 'elements-style',
                        label: 'Element Style',
                        panelId: SCRIPT_SETTINGS_PANEL_ELEMENT_STYLE,
                    },
                    {
                        id: 'elements-visibility',
                        label: 'Element Visibility',
                        panelId: SCRIPT_SETTINGS_PANEL_ELEMENT_VISIBILITY,
                    },
                ],
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

