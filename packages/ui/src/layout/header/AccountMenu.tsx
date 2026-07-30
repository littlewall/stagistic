import {
    Button,
    MenuTrigger,
    Popover,
} from 'react-aria-components';

import {SettingsIcon} from '../../icons/ui';
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
        <div className={styles.settingsMenu}>
            <div className={styles.settingsMenuHeader}>Appearance</div>
            <ThemeModeToggle
                themeMode={themeMode}
                onChange={onThemeChange}
            />
        </div>
    );
};

export const AccountMenu = ({
    themeMode,
    onThemeChange,
}: AccountMenuProps) => {
    return (
        <MenuTrigger>
            <Button className={styles.avatarTrigger} aria-label="Open settings">
                <SettingsIcon className={styles.icon} aria-hidden="true" />
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
