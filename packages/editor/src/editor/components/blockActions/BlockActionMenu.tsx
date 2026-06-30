import {
    type ReactNode,
} from 'react';

import {
    CueHitIcon,
    CueRangeIcon,
} from '../CueIcons';
import styles from '../EditorBlockActionsOverlay.module.css';
import type {
    BlockActionCommand,
    BlockActionIcon,
    BlockActionItem,
} from './actionTypes';
import {
    ContextMenu,
    type ContextMenuItem,
} from './ContextMenu';
import type {BlockActionMenuProps} from './types';

const CueIcon = ({icon}: {icon: BlockActionIcon}) => {
    const paths: Record<BlockActionIcon, ReactNode> = {
        cue: <CueRangeIcon />,
        cueStart: <CueRangeIcon hollowEndpoint="start" />,
        cueHit: <CueHitIcon />,
        cueOut: <CueRangeIcon hollowEndpoint="end" />,
    };

    return paths[icon];
};

const toContextMenuItem = (
    item: BlockActionItem,
    onExecute: (command: BlockActionCommand) => void,
): ContextMenuItem => {
    if (item.kind === 'command') {
        return {
            ...item,
            icon: <CueIcon icon={item.icon} />,
            onClick: () => onExecute(item),
        };
    }

    return {
        ...item,
        icon: <CueIcon icon={item.icon} />,
        items: item.items.map(command => ({
            ...command,
            icon: <CueIcon icon={command.icon} />,
            onClick: () => onExecute(command),
        })),
    };
};

export const BlockActionMenu = ({
    items,
    isMenuAbove,
    menuRef,
    menuStyle,
    onClose,
    onExecute,
}: BlockActionMenuProps) => {
    return (
        <ContextMenu
            ariaLabel="Block actions"
            items={items.map(item => toContextMenuItem(item, onExecute))}
            isMenuAbove={isMenuAbove}
            menuRef={menuRef}
            menuStyle={menuStyle}
            positionClassName={styles.actionMenu}
            rootDataAttributes={{'data-block-action-menu': 'true'}}
            onClose={onClose}
        />
    );
};

export const MoreHorizontalIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle
            cx="6.5"
            cy="12"
            r="1.35"
        />
        <circle
            cx="12"
            cy="12"
            r="1.35"
        />
        <circle
            cx="17.5"
            cy="12"
            r="1.35"
        />
    </svg>
);
