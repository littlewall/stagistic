import {useAnchoredMenuPlacement} from '@stagistic/ui';
import clsx from 'clsx';
import {useRef} from 'react';

import {BLOCK_ICONS} from '../../blocks/controls/blockIcons';
import {formatBlockShortcutLabel} from '../../model/formatBlockShortcut';
import styles from '../EditorToolbar.module.css';
import type {BlockTypeSelectProps} from './contracts';

export const BlockTypeSelect = ({
    options,
    blockShortcuts,
    state,
    actions,
    dropdownRef,
}: BlockTypeSelectProps) => {
    const menuRef = useRef<HTMLDivElement | null>(null);
    const {
        isOpen,
        canChangeBlockType,
        visibleBlockInfo,
        activeBlockInfo,
    } = state;
    const {onSelectMouseDown, onMenuItemMouseDown} = actions;
    const menuPlacement = useAnchoredMenuPlacement({
        anchorRef: dropdownRef,
        menuRef,
        isOpen,
    });

    return (
        <div className={styles.rightGroup}>
            <div
                className={styles.dropdown}
                ref={dropdownRef}
                data-menu-placement={isOpen ? menuPlacement.placement : undefined}
            >
                <button
                    className={styles.selectButton}
                    type="button"
                    aria-label="Change block type"
                    aria-expanded={isOpen}
                    disabled={!canChangeBlockType}
                    onMouseDown={onSelectMouseDown}
                >
                    <span className={clsx(styles.selectIcon, !visibleBlockInfo?.icon && styles.selectIconMuted)}>
                        {visibleBlockInfo?.icon ?? (
                            <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                                focusable="false"
                            >
                                <path d="M6 12h12" />
                            </svg>
                        )}
                    </span>
                    <span className={styles.selectLabel}>
                        {visibleBlockInfo?.label ?? 'Select block in editor'}
                    </span>
                    <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        focusable="false"
                        className={styles.chevron}
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </button>
                {isOpen ? (
                    <div
                        ref={menuRef}
                        className={clsx(
                            styles.menu,
                            menuPlacement.placement === 'above' && styles.above,
                        )}
                        role="menu"
                        style={menuPlacement.style}
                    >
                        {options.map(option => {
                            const shortcut = blockShortcuts?.[option.type];

                            return (
                                <button
                                    key={option.type}
                                    type="button"
                                    role="menuitem"
                                    className={clsx(
                                        styles.menuItem,
                                        option.type === activeBlockInfo?.type && styles.active,
                                    )}
                                    aria-label={`Set block type to ${option.label}`}
                                    onMouseDown={event => onMenuItemMouseDown(option.type, event)}
                                >
                                    <span className={styles.icon}>
                                        {BLOCK_ICONS[option.type]}
                                    </span>
                                    <span className={styles.menuLabel}>
                                        {option.label}
                                    </span>
                                    {shortcut ? (
                                        <span className={styles.menuShortcut}>
                                            {formatBlockShortcutLabel(shortcut)}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                ) : null}
            </div>
        </div>
    );
};
