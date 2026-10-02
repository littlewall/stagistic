import clsx from 'clsx';
import type {ComponentProps, ReactNode} from 'react';
import {
    Dialog,
    DialogTrigger,
    Popover,
    type PopoverProps,
} from 'react-aria-components';

import {IconButton} from '../../atoms/IconButton/IconButton';
import styles from './IconPopover.module.css';

export interface IconPopoverProps {
    'aria-label': string,
    icon: ReactNode,
    children: ReactNode,
    size?: ComponentProps<typeof IconButton>['size'],
    placement?: PopoverProps['placement'],
    /** Dot on the trigger: the panel holds a non-default setting. */
    hasIndicator?: boolean,
    onOpenChange?: (isOpen: boolean) => void,
    className?: string,
}

/** Icon trigger opening a small non-modal panel of controls (not a menu of actions). */
export const IconPopover = ({
    'aria-label': ariaLabel,
    icon,
    children,
    size = 'sm',
    placement = 'bottom end',
    hasIndicator = false,
    onOpenChange,
    className,
}: IconPopoverProps) => (
    <DialogTrigger onOpenChange={onOpenChange}>
        <IconButton
            size={size}
            aria-label={ariaLabel}
            className={clsx(styles.trigger, className)}
        >
            {icon}
            {hasIndicator ? <span className={styles.indicator} data-icon-popover-indicator="true" aria-hidden="true" /> : null}
        </IconButton>
        <Popover
            className={styles.popover}
            placement={placement}
            offset={6}
        >
            <Dialog
                className={styles.dialog}
                aria-label={ariaLabel}
            >
                {children}
            </Dialog>
        </Popover>
    </DialogTrigger>
);
