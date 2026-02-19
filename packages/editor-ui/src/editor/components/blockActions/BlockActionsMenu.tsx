import {ELEMENT_ACT} from '@stagistic/script-core';
import clsx from 'clsx';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import {BLOCK_ICONS} from '../../blocks/controls/blockIcons';
import {FOUNTAIN_BLOCKS_WITHOUT_ACT} from '../../blocks/fountainBlockRegistry';
import styles from '../EditorBlockActionsOverlay.module.css';
import type {BlockActionsMenuProps} from './types';

export const BlockActionsMenu = ({
    blockType,
    isMenuAbove,
    menuRef,
    onMenuItemMouseDown,
    onActMouseDown,
}: BlockActionsMenuProps) => {
    const [isStructuresOpen, setIsStructuresOpen] = useState(false);
    const closeTimeoutRef = useRef<number | null>(null);

    const clearCloseTimeout = useCallback(() => {
        if (closeTimeoutRef.current !== null) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    }, []);
    const openStructures = useCallback(() => {
        clearCloseTimeout();
        setIsStructuresOpen(true);
    }, [clearCloseTimeout]);
    const scheduleCloseStructures = useCallback(() => {
        clearCloseTimeout();
        closeTimeoutRef.current = window.setTimeout(() => {
            setIsStructuresOpen(false);
            closeTimeoutRef.current = null;
        }, 200);
    }, [clearCloseTimeout]);

    useEffect(() => {
        return () => {
            clearCloseTimeout();
        };
    }, [clearCloseTimeout]);

    return (
        <div
            className={clsx(
                styles.menu,
                isMenuAbove && styles.menuAbove,
                isStructuresOpen && styles.menuWithSubmenu,
            )}
            role="menu"
            ref={menuRef}
            onMouseLeave={() => {
                scheduleCloseStructures();
            }}
        >
            <div className={styles.menuPrimaryPanel}>
                {FOUNTAIN_BLOCKS_WITHOUT_ACT.map(option => (
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
                <div className={styles.menuSeparator} role="separator" />
                <button
                    type="button"
                    role="menuitem"
                    className={clsx(styles.menuItem, styles.menuItemSubmenu, isStructuresOpen && styles.menuItemActive)}
                    aria-expanded={isStructuresOpen}
                    onMouseEnter={() => {
                        openStructures();
                    }}
                    onMouseLeave={() => {
                        scheduleCloseStructures();
                    }}
                    onMouseDown={event => {
                        event.preventDefault();
                    }}
                >
                    <span className={styles.menuItemIcon}>
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            focusable="false"
                        >
                            <path d="M4 6h16M4 12h10M4 18h16" />
                        </svg>
                    </span>
                    <span className={styles.menuItemLabel}>Structures</span>
                    <span className={styles.menuItemCaret}>›</span>
                </button>
            </div>
            {isStructuresOpen ? (
                <div
                    className={styles.menuSecondaryPanel}
                    role="menu"
                    onMouseEnter={() => {
                        openStructures();
                    }}
                    onMouseLeave={() => {
                        scheduleCloseStructures();
                    }}
                >
                    <div className={styles.menuSecondaryHeader}>
                        Structures
                    </div>
                    <div className={styles.menuSecondaryContent}>
                        <button
                            type="button"
                            role="menuitem"
                            className={clsx(styles.menuItem, blockType === ELEMENT_ACT && styles.menuItemActive)}
                            onMouseDown={onActMouseDown}
                        >
                            <span className={styles.menuItemIcon}>
                                {BLOCK_ICONS[ELEMENT_ACT]}
                            </span>
                            <span className={styles.menuItemLabel}>ACT</span>
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
};
