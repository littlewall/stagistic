import {useRef} from 'react';
import type {Key} from 'react-aria-components';
import {Button, MenuTrigger} from 'react-aria-components';

import {MoreIcon} from '../../icons';
import {DropdownMenu} from '../DropdownMenu/DropdownMenu';
import styles from './ScriptActionsMenu.module.css';

interface ScriptActionsMenuProps {
    scriptTitle: string,
    onDelete?: (returnFocus?: HTMLElement | null) => void,
    onRename?: (returnFocus?: HTMLElement | null) => void,
    onDuplicate?: (returnFocus?: HTMLElement | null) => void,
}

export const ScriptActionsMenu = ({
    scriptTitle,
    onDelete,
    onRename,
    onDuplicate,
}: ScriptActionsMenuProps) => {
    const trigger = useRef<HTMLButtonElement | null>(null);
    const handleAction = (key: Key) => {
        const callbacks: Record<string, typeof onRename> = {
            rename: onRename,
            duplicate: onDuplicate,
            delete: onDelete,
        };

        callbacks[String(key)]?.(trigger.current);
    };

    return (
        <MenuTrigger>
            <Button
                ref={trigger}
                className={styles.trigger}
                aria-label={`Open actions for ${scriptTitle}`}
            >
                <MoreIcon
                    className={styles.icon}
                    aria-hidden="true"
                />
            </Button>
            <DropdownMenu
                aria-label={`Actions for ${scriptTitle}`}
                items={[
                    {id: 'rename', label: 'Rename script'},
                    {id: 'duplicate', label: 'Duplicate script'},
                    {
                        id: 'delete',
                        label: 'Delete script',
                        tone: 'danger',
                    },
                ]}
                onAction={handleAction}
            />
        </MenuTrigger>
    );
};
