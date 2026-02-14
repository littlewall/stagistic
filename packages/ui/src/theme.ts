export type AppTheme = 'light' | 'dark';

export const APP_THEME_STORAGE_KEY = 'stagistic.theme';
export const DEFAULT_APP_THEME: AppTheme = 'light';

export const isAppTheme = (value: unknown): value is AppTheme => value === 'light' || value === 'dark';

export const readStoredAppTheme = (): AppTheme | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const storedTheme = window.localStorage.getItem(APP_THEME_STORAGE_KEY);

        return isAppTheme(storedTheme) ? storedTheme : null;
    } catch {
        return null;
    }
};

const readDocumentTheme = (): AppTheme | null => {
    if (typeof document === 'undefined') {
        return null;
    }

    const documentTheme = document.documentElement.getAttribute('data-theme');

    return isAppTheme(documentTheme) ? documentTheme : null;
};

export const readPreferredAppTheme = (): AppTheme => {
    return readDocumentTheme() ?? readStoredAppTheme() ?? DEFAULT_APP_THEME;
};

export const applyAppTheme = (theme: AppTheme) => {
    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
    }

    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
        } catch {
            // Ignore storage write failures in constrained environments.
        }
    }
};

export const toggleAppTheme = (theme: AppTheme): AppTheme => {
    return theme === 'dark' ? 'light' : 'dark';
};

export const bootstrapAppTheme = () => {
    applyAppTheme(readPreferredAppTheme());
};
