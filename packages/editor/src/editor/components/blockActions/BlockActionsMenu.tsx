import clsx from 'clsx';

import {BLOCK_ICONS} from '../../blocks/controls/blockIcons';
import {BLOCKS_WITHOUT_ACT} from '../../blocks/blockRegistry';
import styles from '../EditorBlockActionsOverlay.module.css';
import type {BlockActionsMenuProps} from './types';

export const BlockActionsMenu = ({
    blockType,
    isMenuAbove,
    menuRef,
    onMenuItemMouseDown,
}: BlockActionsMenuProps) => {
    return (
        <div
            className={clsx(
                styles.menu,
                isMenuAbove && styles.above,
            )}
            role="menu"
            ref={menuRef}
        >
            <div className={styles.menuPrimaryPanel}>
                {BLOCKS_WITHOUT_ACT.map(option => (
                    <button
                        key={option.type}
                        type="button"
                        role="menuitem"
                        className={clsx(
                            styles.menuItem,
                            option.type === blockType && styles.active,
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
        </div>
    );
};
