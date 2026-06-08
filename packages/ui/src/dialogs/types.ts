import type {ReactNode} from 'react';

import type {ImportPayload} from './importScript/model';
import type {ImportScriptFile} from './importScript/types';

export interface NewScriptModalProps {
    isOpen: boolean,
    onClose: () => void,
    onCreate: (name: string) => void,
}

export interface ImportScriptModalProps {
    isOpen: boolean,
    onClose: () => void,
    onImport: (payload: ImportPayload) => void | Promise<void>,
    onPickFile?: () => Promise<ImportScriptFile | null>,
    preselectedFile?: ImportScriptFile | null,
    isLoading?: boolean,
}

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

export type SettingsNavItem = ({
    kind: 'item',
} & SettingsNavLinkItem) | ({
    kind: 'expandable',
} & SettingsNavExpandableItem);

export interface SettingsNavGroup {
    id: string,
    label: string,
    items: SettingsNavItem[],
}

export interface ScriptSettingsModalProps {
    isOpen: boolean,
    title?: string,
    groups: SettingsNavGroup[],
    activePanelId: string,
    expandedItemIds: string[],
    onClose: () => void,
    onSelectPanel: (panelId: string) => void,
    onToggleExpand: (itemId: string) => void,
    children: ReactNode,
}
