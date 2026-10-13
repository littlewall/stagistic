import {MenuTrigger, Popover} from 'react-aria-components';

import {Button} from '../../atoms/Button/Button';
import {Tooltip} from '../../atoms/Tooltip/Tooltip';
import type {AccountMenuAccount} from '../../dialogs/account/types';
import {AppearanceIcon, UserCircleIcon} from '../../icons/ui';
import {type AppThemeMode} from '../../theme/theme';
import styles from '../AppHeader.module.css';
import {ThemeModeToggle} from './ThemeModeToggle';

type AccountMenuProps = {
    themeMode: AppThemeMode,
    onThemeChange: (mode: AppThemeMode) => void,
    /** Hosts with cloud sync; without it the menu is appearance only. */
    account?: AccountMenuAccount,
};

const AccountSection = ({account}: {account: AccountMenuAccount}) => (
    <>
        <div className={styles.settingsMenuHeader}>{account.email ?? 'Not signed in'}</div>
        <div className={styles.accountActions}>
            {account.email ? (
                <>
                    <Button
                        variant="ghost"
                        onPress={account.onOpenAccountSettings}
                    >
                        Account settings…
                    </Button>
                    <Button
                        variant="ghost"
                        onPress={account.onSignOut}
                    >
                        Sign out
                    </Button>
                </>
            ) : (
                <Button
                    variant="ghost"
                    onPress={account.onSignIn}
                >
                    Sign in
                </Button>
            )}
        </div>
    </>
);

export const AccountMenuContent = ({
    themeMode,
    onThemeChange,
    account,
}: AccountMenuProps) => {
    return (
        <div className={styles.settingsMenu}>
            {account ? <AccountSection account={account} /> : null}
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
    account,
}: AccountMenuProps) => {
    const label = account ? 'Account and appearance' : 'Appearance';
    const Icon = account ? UserCircleIcon : AppearanceIcon;

    return (
        <MenuTrigger>
            {/*
             * A cog promises the whole settings surface, but this popover only
             * carries `Appearance` — the real settings live behind the header's
             * own gear. The palette matches what is behind the button and stays honest
             * as the menu grows with further look-and-feel controls (density is
             * the obvious next one, though nothing implements it today — the dead
             * `.size-sm/md/lg` classes went with the density coefficient they set).
             */}
            <Tooltip
                label={label}
                placement="bottom"
            >
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={label}
                >
                    <Icon
                        className={styles.icon}
                        aria-hidden="true"
                    />
                </Button>
            </Tooltip>
            <Popover
                className={styles.menuPopover}
                placement="bottom end"
            >
                <AccountMenuContent
                    themeMode={themeMode}
                    onThemeChange={onThemeChange}
                    account={account}
                />
            </Popover>
        </MenuTrigger>
    );
};
