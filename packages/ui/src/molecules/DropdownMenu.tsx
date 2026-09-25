import clsx from 'clsx';
import type {ReactNode} from 'react';
import type {Key} from 'react-aria-components';
import {Menu, MenuItem, Popover, type PopoverProps} from 'react-aria-components';

import styles from './DropdownMenu.module.css';

export interface DropdownMenuItem {
    id: string;
    label: ReactNode;
    tone?: 'default' | 'danger';
    isCurrent?: boolean;
    dividerBefore?: boolean;
}

export interface DropdownMenuProps {
    'aria-label': string;
    items: readonly DropdownMenuItem[];
    onAction: (key: Key) => void;
    placement?: PopoverProps['placement'];
}

export const DropdownMenu = ({'aria-label': ariaLabel, items, onAction, placement = 'bottom end'}: DropdownMenuProps) => (
    <Popover className={styles.popover} placement={placement}>
        <Menu className={styles.menu} aria-label={ariaLabel} onAction={onAction}>
            {items.map(item => (
                <MenuItem
                    className={clsx(item.tone === 'danger' ? styles.dangerItem : styles.item, item.dividerBefore && styles.dividerBefore)}
                    id={item.id}
                    key={item.id}
                    aria-current={item.isCurrent ? 'true' : undefined}
                >
                    <span className={styles.itemLabel}>{item.label}</span>
                    {item.isCurrent ? (
                        <span className={styles.currentMark} aria-hidden="true">
                            ✓
                        </span>
                    ) : null}
                </MenuItem>
            ))}
        </Menu>
    </Popover>
);
