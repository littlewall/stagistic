import clsx from 'clsx';
import {DarkThemeIcon, LightThemeIcon, SystemThemeIcon} from '../../icons/ui';
import {Button} from 'react-aria-components';

import {type AppThemeMode} from '../../theme';
import styles from '../AppHeader.module.css';

type ThemeModeToggleProps = {
    themeMode: AppThemeMode,
    onChange: (mode: AppThemeMode) => void,
};

export const ThemeModeToggle = ({
    themeMode,
    onChange,
}: ThemeModeToggleProps) => {
    return (
        <div className={styles.themeControlsContainer}>
            <div
                className={styles.themeControls}
                role="group"
                aria-label="Theme mode"
            >
                <Button
                    className={clsx(styles.themeButton, themeMode === 'light' && styles.active)}
                    onPress={() => {
                        onChange('light');
                    }}
                    aria-label="Light theme"
                >
                    <LightThemeIcon className={styles.icon} aria-hidden="true" />
                </Button>
                <Button
                    className={clsx(styles.themeButton, themeMode === 'dark' && styles.active)}
                    onPress={() => {
                        onChange('dark');
                    }}
                    aria-label="Dark theme"
                >
                    <DarkThemeIcon className={styles.icon} aria-hidden="true" />
                </Button>
                <Button
                    className={clsx(styles.themeButton, themeMode === 'auto' && styles.active)}
                    onPress={() => {
                        onChange('auto');
                    }}
                    aria-label="System theme"
                >
                    <SystemThemeIcon className={styles.icon} aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
};
