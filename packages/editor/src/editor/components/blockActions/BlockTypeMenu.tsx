import clsx from 'clsx';

import {BLOCKS_WITHOUT_ACT} from '../../blocks/blockRegistry';
import {BLOCK_ICONS} from '../../blocks/controls/blockIcons';
import styles from '../EditorBlockActionsOverlay.module.css';
import type {BlockTypeMenuProps} from './types';

export const BlockTypeMenu = ({
    blockType,
    isMenuAbove,
    menuRef,
    menuStyle,
    onMenuItemMouseDown,
}: BlockTypeMenuProps) => {
    return (
        <div
            className={clsx(
                styles.menu,
                styles.typeMenu,
                isMenuAbove && styles.above,
            )}
            data-block-type-menu="true"
            role="menu"
            ref={menuRef}
            style={menuStyle}
        >
            <div className={styles.menuPrimaryPanel} data-block-menu-panel="primary">
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
