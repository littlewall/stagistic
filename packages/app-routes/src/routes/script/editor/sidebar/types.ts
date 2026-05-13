import type {ReactNode} from 'react';

export type SidebarPanelId = string;

export interface SidebarPanel {
    readonly id: SidebarPanelId,
    readonly label: string,
    readonly renderContent: () => ReactNode,
    readonly renderContextActions?: () => ReactNode,
}

export interface SidebarToggle {
    readonly isOpen: boolean,
    readonly onToggle: () => void,
}

export type SidebarSide = 'left' | 'right';
