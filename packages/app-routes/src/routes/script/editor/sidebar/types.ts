import type {ReactNode} from 'react';

export type SidebarPanelId = string;

export interface SidebarPanel {
    readonly id: SidebarPanelId,
    readonly label: string,
    readonly renderContent: (navigation: ReactNode) => ReactNode,
}

export interface SidebarToggle {
    readonly isOpen: boolean,
    readonly label: string,
    readonly onToggle: () => void,
}

export type SidebarSide = 'left' | 'right';
