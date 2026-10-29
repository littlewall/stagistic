import type {ComponentProps, ReactNode} from 'react';
import {MenuTrigger} from 'react-aria-components';

import {Button} from '../../atoms/Button/Button';
import {ChevronDownIcon} from '../../icons/ui/ChevronDownIcon';
import {DropdownMenu, type DropdownMenuItem} from '../DropdownMenu/DropdownMenu';
import styles from './ButtonDropdownMenu.module.css';

export interface ButtonDropdownMenuProps {
    label: ReactNode,
    'aria-label'?: string,
    items: readonly DropdownMenuItem[],
    onAction: (id: string) => void,
    variant?: ComponentProps<typeof Button>['variant'],
    size?: ComponentProps<typeof Button>['size'],
}

/** A labelled button that opens a menu of related actions, e.g. "Edit format ▾". */
export const ButtonDropdownMenu = ({
    label,
    'aria-label': ariaLabel,
    items,
    onAction,
    variant = 'outline',
    size = 'sm',
}: ButtonDropdownMenuProps) => (
    <MenuTrigger>
        <Button variant={variant} size={size} aria-label={ariaLabel}>
            <span className={styles.label}>
                {label}
                <ChevronDownIcon className={styles.chevron} aria-hidden="true" />
            </span>
        </Button>
        <DropdownMenu
            aria-label={ariaLabel ?? (typeof label === 'string' ? label : 'Actions')}
            items={items}
            onAction={key => onAction(String(key))}
        />
    </MenuTrigger>
);
