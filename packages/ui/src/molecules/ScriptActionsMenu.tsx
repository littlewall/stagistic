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
}

export const ScriptActionsMenu = ({scriptTitle}: ScriptActionsMenuProps) => (
    <MenuTrigger>
        <Button
            className={styles.trigger}
            aria-label={`Open actions for ${scriptTitle}`}
        >
            <MoreIcon className={styles.icon} aria-hidden="true" />
        </Button>
        <Popover className={styles.popover} placement="bottom end">
            <Menu className={styles.menu} aria-label={`Actions for ${scriptTitle}`}>
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
