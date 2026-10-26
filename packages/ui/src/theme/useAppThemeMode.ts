import {useEffect, useState} from 'react';

import {
    applyAppThemeMode,
    type AppThemeMode,
    readPreferredAppThemeMode,
    subscribeToSystemThemeChange,
} from './theme';

/**
 * The chosen theme mode, applied to the document and stored. `auto` keeps
 * following the system theme for as long as the caller stays mounted, so mount
 * it once for the whole app rather than per screen.
 */
export const useAppThemeMode = () => {
    const [themeMode, setThemeMode] = useState<AppThemeMode>(() => readPreferredAppThemeMode());

    useEffect(() => {
        applyAppThemeMode(themeMode);

        if (themeMode !== 'auto') {
            return;
        }

        return subscribeToSystemThemeChange(() => {
            applyAppThemeMode('auto');
        });
    }, [themeMode]);

    return [themeMode, setThemeMode] as const;
};
