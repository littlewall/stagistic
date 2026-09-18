import type {Key} from 'react-aria-components';
import {Button, MenuTrigger} from 'react-aria-components';

import {MoreIcon} from '../icons';
import {DropdownMenu} from './DropdownMenu';

import styles from './ScriptActionsMenu.module.css';

interface ScriptActionsMenuProps {
    scriptTitle: string;
    onDelete?: () => void;
    onRename?: () => void;
    onDuplicate?: () => void;
}

export const ScriptActionsMenu = ({scriptTitle, onDelete, onRename, onDuplicate}: ScriptActionsMenuProps) => {
    const handleAction = (key: Key) => {
        if (key === 'rename') {
            onRename?.();
        } else if (key === 'duplicate') {
            onDuplicate?.();
        } else if (key === 'delete') {
            onDelete?.();
        }
    };

    return (
        <MenuTrigger>
            <Button className={styles.trigger} aria-label={`Open actions for ${scriptTitle}`}>
                <MoreIcon className={styles.icon} aria-hidden="true" />
            </Button>
            <DropdownMenu
                aria-label={`Actions for ${scriptTitle}`}
                items={[
                    {id: 'rename', label: 'Rename script'},
                    {id: 'duplicate', label: 'Duplicate script'},
                    {id: 'delete', label: 'Delete script', tone: 'danger'},
                ]}
                onAction={handleAction}
            />
        </MenuTrigger>
    );
};
