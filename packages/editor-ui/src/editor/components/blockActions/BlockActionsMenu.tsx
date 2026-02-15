import clsx from 'clsx';
import {
    type MouseEvent as ReactMouseEvent,
    type RefObject,
} from 'react';

import {BLOCK_ICONS} from '../../blocks/controls/blockIcons';
import {FOUNTAIN_BLOCKS} from '../../blocks/fountainBlockRegistry';
import {type FountainBlockType} from '../../tiptap/fountainCore';
import styles from '../EditorBlockActionsOverlay.module.css';

type BlockActionsMenuProps = {
    blockType: FountainBlockType,
    isMenuAbove: boolean,
    menuRef: RefObject<HTMLDivElement | null>,
    onMenuItemMouseDown: (
        optionType: (typeof FOUNTAIN_BLOCKS)[number]['type'],
        event: ReactMouseEvent<HTMLButtonElement>,
    ) => void,
};

export const BlockActionsMenu = ({
    blockType,
    isMenuAbove,
    menuRef,
    onMenuItemMouseDown,
}: BlockActionsMenuProps) => {
    return (
        <div
            className={clsx(styles.menu, isMenuAbove && styles.menuAbove)}
            role="menu"
            ref={menuRef}
        >
            {FOUNTAIN_BLOCKS.map(option => (
                <button
                    key={option.type}
                    type="button"
                    role="menuitem"
                    className={clsx(
                        styles.menuItem,
                        option.type === blockType && styles.menuItemActive,
                    )}
                    onMouseDown={event => onMenuItemMouseDown(option.type, event)}
                >
                    <span className={styles.menuItemIcon}>
                        {BLOCK_ICONS[option.type]}
                    </span>
                    <span className={styles.menuItemLabel}>{option.label}</span>
                </button>
            ))}
        </div>
    );
};
