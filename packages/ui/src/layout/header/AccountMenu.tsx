import {
    MenuTrigger,
    Popover,
} from 'react-aria-components';

import {Button} from '../../atoms/Button';
import {Tooltip} from '../../atoms/Tooltip';
import {AppearanceIcon} from '../../icons/ui';
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
            {/*
              * A cog promises the whole settings surface, but this popover only
              * carries `Appearance` — the real settings live behind the header's
              * own gear. The palette matches what is behind the button and stays honest
              * as the menu grows with further look-and-feel controls (density is
              * the obvious next one: `.size-sm/md/lg` exist in `base.css` with no
              * control anywhere).
              */}
            <Tooltip label="Appearance" placement="bottom">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Appearance"
                >
                    <AppearanceIcon className={styles.icon} aria-hidden="true" />
                </Button>
            </Tooltip>
            <Popover className={styles.menuPopover} placement="bottom end">
                <AccountMenuContent
                    themeMode={themeMode}
                    onThemeChange={onThemeChange}
                />
            </Popover>
        </MenuTrigger>
    );
};
