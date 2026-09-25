import {type ReactNode, useCallback, useMemo} from 'react';

import {SidebarPanelSelect} from './SidebarPanelSelect';
import type {SidebarPanel, SidebarPanelId, SidebarToggle} from './types';
import {useSidebarLayout} from './useSidebarLayout';

interface UseEditorSidebarsArgs {
    panels: readonly SidebarPanel[];
    defaultLeftPanelId?: SidebarPanelId;
    defaultRightPanelId?: SidebarPanelId;
    storageScope: string;
}

interface UseEditorSidebarsResult {
    leftSidebarToggle: SidebarToggle;
    rightSidebarToggle: SidebarToggle;
    leftSidebar: ReactNode;
    rightSidebar: ReactNode;
    /** Shows a panel: opens its side if it is already selected there, else selects it on the right. */
    revealPanel: (panelId: SidebarPanelId) => void;
    isPanelOpen: (panelId: SidebarPanelId) => boolean;
}

export const useEditorSidebars = ({panels, defaultLeftPanelId, defaultRightPanelId, storageScope}: UseEditorSidebarsArgs): UseEditorSidebarsResult => {
    const availablePanelIds = useMemo(() => panels.map(panel => panel.id), [panels]);
    const resolvedDefaultLeft = defaultLeftPanelId ?? panels[0]?.id ?? '';
    const resolvedDefaultRight = defaultRightPanelId ?? panels[panels.length - 1]?.id ?? resolvedDefaultLeft;

    const layout = useSidebarLayout({
        availablePanelIds,
        defaultLeftPanelId: resolvedDefaultLeft,
        defaultRightPanelId: resolvedDefaultRight,
        storageScope,
    });

    const panelById = useMemo(() => {
        const map = new Map<SidebarPanelId, SidebarPanel>();

        panels.forEach(panel => {
            map.set(panel.id, panel);
        });

        return map;
    }, [panels]);

    const leftPanel = panelById.get(layout.leftPanelId);
    const rightPanel = panelById.get(layout.rightPanelId);
    const leftNavigation = (
        <SidebarPanelSelect
            side="left"
            panels={panels}
            selectedPanelId={layout.leftPanelId}
            onSelectPanel={layout.selectLeft}
            ariaLabel="Select left sidebar panel"
        />
    );
    const rightNavigation = (
        <SidebarPanelSelect
            side="right"
            panels={panels}
            selectedPanelId={layout.rightPanelId}
            onSelectPanel={layout.selectRight}
            ariaLabel="Select right sidebar panel"
        />
    );

    const {leftPanelId, rightPanelId, isLeftOpen, isRightOpen, toggleLeft, toggleRight, selectRight} = layout;
    const revealPanel = useCallback(
        (panelId: SidebarPanelId) => {
            if (leftPanelId === panelId) {
                if (!isLeftOpen) {
                    toggleLeft();
                }

                return;
            }

            if (rightPanelId !== panelId) {
                selectRight(panelId);
            }

            if (!isRightOpen) {
                toggleRight();
            }
        },
        [isLeftOpen, isRightOpen, leftPanelId, rightPanelId, selectRight, toggleLeft, toggleRight],
    );
    const isPanelOpen = useCallback(
        (panelId: SidebarPanelId) => {
            return (leftPanelId === panelId && isLeftOpen) || (rightPanelId === panelId && isRightOpen);
        },
        [isLeftOpen, isRightOpen, leftPanelId, rightPanelId],
    );

    return {
        revealPanel,
        isPanelOpen,
        leftSidebarToggle: {
            isOpen: layout.isLeftOpen,
            label: leftPanel?.label ?? 'Left',
            onToggle: layout.toggleLeft,
        },
        rightSidebarToggle: {
            isOpen: layout.isRightOpen,
            label: rightPanel?.label ?? 'Right',
            onToggle: layout.toggleRight,
        },
        leftSidebar: leftPanel?.renderContent(leftNavigation) ?? null,
        rightSidebar: rightPanel?.renderContent(rightNavigation) ?? null,
    };
};
