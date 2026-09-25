import {MenuTrigger} from 'react-aria-components';

import {IconButton} from '../atoms/IconButton';
import {MoreIcon} from '../icons';
import {DropdownMenu, type DropdownMenuItem} from './DropdownMenu';

export interface MoreActionsMenuProps {
    'aria-label': string;
    items: readonly DropdownMenuItem[];
    onAction: (id: string) => void;
}

/** Compact "⋯" trigger opening a DropdownMenu; for row- and card-level actions. */
export const MoreActionsMenu = ({'aria-label': ariaLabel, items, onAction}: MoreActionsMenuProps) => (
    <MenuTrigger>
        <IconButton size="xs" aria-label={ariaLabel}>
            <MoreIcon aria-hidden="true" />
        </IconButton>
        <DropdownMenu aria-label={ariaLabel} items={items} onAction={key => onAction(String(key))} />
    </MenuTrigger>
);
