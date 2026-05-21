import {UserCircle} from 'iconoir-react';
import {
    Button,
    Menu,
    MenuItem,
    MenuTrigger,
    Popover,
    Separator,
} from 'react-aria-components';

import {type AppThemeMode} from '../../theme';
import styles from '../AppHeader.module.css';
import {ThemeModeToggle} from './ThemeModeToggle';

type AccountMenuProps = {
    themeMode: AppThemeMode,
    onThemeChange: (mode: AppThemeMode) => void,
    onAction?: (actionId: string) => void,
};

export const AccountMenu = ({
    themeMode,
    onThemeChange,
    onAction,
}: AccountMenuProps) => {
    return (
        <MenuTrigger>
            <Button className={styles.avatarTrigger} aria-label="Open account menu">
                <UserCircle className={styles.icon} aria-hidden="true" />
            </Button>
            <Popover className={styles.menuPopover} placement="bottom end">
                <div className={styles.accountPopoverContent}>
                    <ThemeModeToggle
                        themeMode={themeMode}
                        onChange={onThemeChange}
                    />
                    <Menu
                        className={styles.menu}
                        onAction={key => {
                            if (typeof key !== 'string') {
                                return;
                            }

                            onAction?.(key);
                        }}
                    >
                        <MenuItem className={styles.menuItem} id="profile">
                            Account settings
                        </MenuItem>
                        <Separator className={styles.menuSeparator} />
                        <MenuItem className={styles.menuItem} id="logout">
                            Sign out
                        </MenuItem>
                    </Menu>
                </div>
            </Popover>
        </MenuTrigger>
    );
};
