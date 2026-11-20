import type {ReactNode} from 'react';

import type {ModalFocusRestoreOptions} from '../modal/modalFocusTypes';

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
    headerAccessory?: ReactNode,
    id: string,
    /** Omit for a trailing headerless group, e.g. a danger zone set apart from the labelled groups. */
    label?: string,
    items: SettingsNavItem[],
}

export interface SettingsModalProps extends ModalFocusRestoreOptions {
    isOpen: boolean,
    title?: string,
    /** `compact` suits a handful of short sections; `workspace` fills the window. */
    size?: 'workspace' | 'compact',
    groups: SettingsNavGroup[],
    activePanelId: string,
    /** A strip between the header and the body, e.g. the read-only notice of a stored draft or version. */
    notice?: ReactNode,
    expandedItemIds?: string[],
    onClose: () => void,
    onSelectPanel: (panelId: string) => void,
    onToggleExpand?: (itemId: string) => void,
    children: ReactNode,
}
