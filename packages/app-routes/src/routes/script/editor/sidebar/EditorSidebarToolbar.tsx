import {ArrowLeftIcon, ArrowRightIcon} from '@stagistic/ui';
import {type ReactNode} from 'react';

import styles from './EditorSidebarToolbar.module.css';
import {SidebarPanelSelect} from './SidebarPanelSelect';
import type {
    SidebarPanel,
    SidebarPanelId,
    SidebarSide,
} from './types';

interface EditorSidebarToolbarProps {
    side: SidebarSide,
    panels: readonly SidebarPanel[],
    selectedPanelId: SidebarPanelId,
    onSelectPanel: (panelId: SidebarPanelId) => void,
    onClose: () => void,
    contextActions?: ReactNode,
}

export const EditorSidebarToolbar = ({
    side,
    panels,
    selectedPanelId,
    onSelectPanel,
    onClose,
    contextActions,
}: EditorSidebarToolbarProps) => {
    const closeButton = (
        <button
            type="button"
            className={styles.closeButton}
            aria-label={side === 'left' ? 'Close left sidebar' : 'Close right sidebar'}
            onMouseDown={event => {
                event.preventDefault();
                onClose();
            }}
        >
            {side === 'left' ? <ArrowLeftIcon /> : <ArrowRightIcon />}
        </button>
    );

    const panelSelect = (
        <SidebarPanelSelect
            side={side}
            panels={panels}
            selectedPanelId={selectedPanelId}
            onSelectPanel={onSelectPanel}
            ariaLabel={side === 'left' ? 'Select left sidebar panel' : 'Select right sidebar panel'}
        />
    );

    const contextActionsEl = contextActions ? (
        <div className={styles.contextActions}>
            {contextActions}
        </div>
    ) : null;

    if (side === 'left') {
        return (
            <div className={styles.toolbar}>
                {closeButton}
                {panelSelect}
                {contextActionsEl}
            </div>
        );
    }

    return (
        <div className={styles.toolbar}>
            {contextActionsEl}
            {panelSelect}
            {closeButton}
        </div>
    );
};
