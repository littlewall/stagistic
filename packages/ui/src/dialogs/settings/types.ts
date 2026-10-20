import type {ReactNode} from 'react';

export interface SettingsNavSubItem {
    id: string,
    label: string,
    panelId: string,
    icon?: ReactNode,
}

export interface SettingsNavLinkItem {
    id: string,
    label: string,
    panelId: string,
}

export interface SettingsNavExpandableItem {
    id: string,
    label: string,
    subItems: SettingsNavSubItem[],
}

export interface SettingsNavSeparatorItem {
    id: string,
}

export type SettingsNavItem =
    | ({
        kind: 'item',
    } & SettingsNavLinkItem)
    | ({
        kind: 'expandable',
    } & SettingsNavExpandableItem)
    | ({
        kind: 'separator',
    } & SettingsNavSeparatorItem);

export interface SettingsNavGroup {
    id: string,
    label: string,
    items: SettingsNavItem[],
}

export interface SettingsModalProps {
    isOpen: boolean,
    title?: string,
    /** `compact` suits a handful of short sections; `workspace` fills the window. */
    size?: 'workspace' | 'compact',
    groups: SettingsNavGroup[],
    activePanelId: string,
    expandedItemIds?: string[],
    onClose: () => void,
    onSelectPanel: (panelId: string) => void,
    onToggleExpand?: (itemId: string) => void,
    children: ReactNode,
}
