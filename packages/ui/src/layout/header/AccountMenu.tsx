import {
    Button,
    MenuTrigger,
    Popover,
} from 'react-aria-components';

import {UserCircleIcon} from '../../icons/ui';
import {type AppThemeMode} from '../../theme';
import styles from '../AppHeader.module.css';
import {ThemeModeToggle} from './ThemeModeToggle';

type AccountMenuProps = {
    themeMode: AppThemeMode,
    onThemeChange: (mode: AppThemeMode) => void,
};

export const AccountMenuContent = ({
    themeMode,
    onThemeChange,
}: AccountMenuProps) => {
    return (
        <ThemeModeToggle
            themeMode={themeMode}
            onChange={onThemeChange}
        />
    );
};

export const AccountMenu = ({
    themeMode,
    onThemeChange,
}: AccountMenuProps) => {
    return (
        <MenuTrigger>
            <Button className={styles.avatarTrigger} aria-label="Open account menu">
                <UserCircleIcon className={styles.icon} aria-hidden="true" />
            </Button>
            <Popover className={styles.menuPopover} placement="bottom end">
                <AccountMenuContent
                    themeMode={themeMode}
                    onThemeChange={onThemeChange}
                />
            </Popover>
        </MenuTrigger>
    );
};
