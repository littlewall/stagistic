import type {ComponentProps, ReactNode} from 'react';
import {Dialog, DialogTrigger, Popover, type PopoverProps} from 'react-aria-components';

import {IconButton} from '../atoms/IconButton';

import styles from './IconPopover.module.css';

export interface IconPopoverProps {
    'aria-label': string;
    icon: ReactNode;
    children: ReactNode;
    size?: ComponentProps<typeof IconButton>['size'];
    placement?: PopoverProps['placement'];
}

/** Icon trigger opening a small non-modal panel of controls (not a menu of actions). */
export const IconPopover = ({'aria-label': ariaLabel, icon, children, size = 'sm', placement = 'bottom end'}: IconPopoverProps) => (
    <DialogTrigger>
        <IconButton size={size} aria-label={ariaLabel}>
            {icon}
        </IconButton>
        <Popover className={styles.popover} placement={placement} offset={6}>
            <Dialog className={styles.dialog} aria-label={ariaLabel}>
                {children}
            </Dialog>
        </Popover>
    </DialogTrigger>
);
