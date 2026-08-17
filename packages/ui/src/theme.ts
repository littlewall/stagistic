export type AppTheme = 'light' | 'dark';
export type AppThemeMode = AppTheme | 'auto';

export const APP_THEME_STORAGE_KEY = 'stagistic.theme';
export const DEFAULT_APP_THEME: AppTheme = 'light';
export const DEFAULT_APP_THEME_MODE: AppThemeMode = 'auto';

const DARK_THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';
const REDUCED_MOTION_MEDIA_QUERY = '(prefers-reduced-motion: reduce)';

export const isAppTheme = (value: unknown): value is AppTheme => value === 'light' || value === 'dark';
export const isAppThemeMode = (value: unknown): value is AppThemeMode => value === 'auto' || isAppTheme(value);

export const readSystemAppTheme = (): AppTheme => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return DEFAULT_APP_THEME;
    }

    return window.matchMedia(DARK_THEME_MEDIA_QUERY).matches ? 'dark' : 'light';
};

export const resolveAppTheme = (themeMode: AppThemeMode): AppTheme => {
    return themeMode === 'auto' ? readSystemAppTheme() : themeMode;
};

export const readStoredAppThemeMode = (): AppThemeMode | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const storedThemeMode = window.localStorage.getItem(APP_THEME_STORAGE_KEY);

        return isAppThemeMode(storedThemeMode) ? storedThemeMode : null;
    } catch {
        return null;
    }
};

export const readStoredAppTheme = (): AppTheme | null => {
    const storedThemeMode = readStoredAppThemeMode();

    return storedThemeMode ? resolveAppTheme(storedThemeMode) : null;
};

const readDocumentTheme = (): AppTheme | null => {
    if (typeof document === 'undefined') {
        return null;
    }

    const documentTheme = document.documentElement.getAttribute('data-theme');

    return isAppTheme(documentTheme) ? documentTheme : null;
};

const readDocumentThemeMode = (): AppThemeMode | null => {
    if (typeof document === 'undefined') {
        return null;
    }

    const documentThemeMode = document.documentElement.getAttribute('data-theme-mode');

    if (isAppThemeMode(documentThemeMode)) {
        return documentThemeMode;
    }

    const documentTheme = document.documentElement.getAttribute('data-theme');

    return isAppTheme(documentTheme) ? documentTheme : null;
};

export const readPreferredAppThemeMode = (): AppThemeMode => {
    return readDocumentThemeMode() ?? readStoredAppThemeMode() ?? DEFAULT_APP_THEME_MODE;
};

export const readPreferredAppTheme = (): AppTheme => {
    return readDocumentTheme() ?? resolveAppTheme(readPreferredAppThemeMode());
};

type ViewTransitionDocument = Document & {
    startViewTransition?: (callback: () => void) => unknown,
};

/**
 * A cross-fade is worth it only when the swap both changes colour and is allowed
 * to animate: the first paint has no previous theme to fade from, switching
 * between `dark` and `auto` that resolves to dark changes nothing, and a user
 * asking for less motion is asking for less of this too.
 */
const shouldCrossFadeTheme = (previousTheme: AppTheme | null, nextTheme: AppTheme): boolean => {
    if (previousTheme === null || previousTheme === nextTheme) {
        return false;
    }

    if (typeof (document as ViewTransitionDocument).startViewTransition !== 'function') {
        return false;
    }

    return !(typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia(REDUCED_MOTION_MEDIA_QUERY).matches);
};

export const applyAppThemeMode = (themeMode: AppThemeMode): AppTheme => {
    const resolvedTheme = resolveAppTheme(themeMode);

    if (typeof document !== 'undefined') {
        const applyThemeAttributes = () => {
            document.documentElement.setAttribute('data-theme-mode', themeMode);
            document.documentElement.setAttribute('data-theme', resolvedTheme);
        };

        /*
         * The view transition owns the swap: the browser snapshots the page, runs the
         * callback, snapshots again and blends the two textures on the compositor —
         * one paint instead of a style recalc per frame across every element (see
         * base.css for the numbers). The cost is that the attributes land on the next
         * frame rather than synchronously, which is why anything reading them back
         * has to wait a frame; the returned theme is still available immediately.
         */
        if (shouldCrossFadeTheme(readDocumentTheme(), resolvedTheme)) {
            (document as ViewTransitionDocument).startViewTransition?.(applyThemeAttributes);
        } else {
            applyThemeAttributes();
        }
    }

    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(APP_THEME_STORAGE_KEY, themeMode);
        } catch {
            // Ignore storage write failures in constrained environments.
        }
    }

    return resolvedTheme;
};

export const applyAppTheme = (theme: AppTheme) => {
    applyAppThemeMode(theme);
};

export const toggleAppTheme = (theme: AppTheme): AppTheme => {
    return theme === 'dark' ? 'light' : 'dark';
};

export const toggleAppThemeMode = (themeMode: AppThemeMode): AppThemeMode => {
    if (themeMode === 'light') {
        return 'dark';
    }

    if (themeMode === 'dark') {
        return 'auto';
    }

    return 'light';
};

export const subscribeToSystemThemeChange = (onChange: (theme: AppTheme) => void): (() => void) => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => {};
    }

    const mediaQuery = window.matchMedia(DARK_THEME_MEDIA_QUERY);
    const handleThemeChange = (event: MediaQueryListEvent) => {
        onChange(event.matches ? 'dark' : 'light');
    };

    if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleThemeChange);

        return () => {
            mediaQuery.removeEventListener('change', handleThemeChange);
        };
    }

    mediaQuery.addListener(handleThemeChange);

    return () => {
        mediaQuery.removeListener(handleThemeChange);
    };
};

export const bootstrapAppTheme = () => {
    applyAppThemeMode(readPreferredAppThemeMode());
};
