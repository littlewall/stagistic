import clsx from 'clsx';
import {
    Computer,
    HalfMoon,
    SunLight,
} from 'iconoir-react';
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
                    <SunLight className={styles.icon} aria-hidden="true" />
                </Button>
                <Button
                    className={clsx(styles.themeButton, themeMode === 'dark' && styles.active)}
                    onPress={() => {
                        onChange('dark');
                    }}
                    aria-label="Dark theme"
                >
                    <HalfMoon className={styles.icon} aria-hidden="true" />
                </Button>
                <Button
                    className={clsx(styles.themeButton, themeMode === 'auto' && styles.active)}
                    onPress={() => {
                        onChange('auto');
                    }}
                    aria-label="System theme"
                >
                    <Computer className={styles.icon} aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
};
