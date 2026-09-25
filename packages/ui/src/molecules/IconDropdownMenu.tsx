import type {ComponentProps, ReactNode} from 'react';
import {MenuTrigger} from 'react-aria-components';

import {IconButton} from '../atoms/IconButton';
import {DropdownMenu, type DropdownMenuItem} from './DropdownMenu';

export interface IconDropdownMenuProps {
    'aria-label': string;
    icon: ReactNode;
    items: readonly DropdownMenuItem[];
    size?: ComponentProps<typeof IconButton>['size'];
    onAction: (id: string) => void;
}

export const IconDropdownMenu = ({'aria-label': ariaLabel, icon, items, size = 'sm', onAction}: IconDropdownMenuProps) => (
    <MenuTrigger>
        <IconButton size={size} aria-label={ariaLabel}>
            {icon}
        </IconButton>
        <DropdownMenu aria-label={ariaLabel} items={items} onAction={key => onAction(String(key))} />
    </MenuTrigger>
);
