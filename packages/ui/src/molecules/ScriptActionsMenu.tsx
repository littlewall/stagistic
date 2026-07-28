import type {Key} from 'react-aria-components';
import {
    Button,
    Menu,
    MenuItem,
    MenuTrigger,
    Popover,
} from 'react-aria-components';

import {MoreIcon} from '../icons';
import styles from './ScriptActionsMenu.module.css';

interface ScriptActionsMenuProps {
    scriptTitle: string,
    onDelete?: () => void,
    onRename?: () => void,
    onDuplicate?: () => void,
}

export const ScriptActionsMenu = ({
    scriptTitle,
    onDelete,
    onRename,
    onDuplicate,
}: ScriptActionsMenuProps) => {
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
            <Button
                className={styles.trigger}
                aria-label={`Open actions for ${scriptTitle}`}
            >
                <MoreIcon className={styles.icon} aria-hidden="true" />
            </Button>
            <Popover className={styles.popover} placement="bottom end">
                <Menu
                    className={styles.menu}
                    aria-label={`Actions for ${scriptTitle}`}
                    onAction={handleAction}
                >
                    <MenuItem className={styles.item} id="rename">
                        Rename script
                    </MenuItem>
                    <MenuItem className={styles.item} id="duplicate">
                        Duplicate script
                    </MenuItem>
                    <MenuItem className={styles.dangerItem} id="delete">
                        Delete script
                    </MenuItem>
                </Menu>
            </Popover>
        </MenuTrigger>
    );
};
