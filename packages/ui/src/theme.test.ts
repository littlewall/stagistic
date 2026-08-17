import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {
    APP_THEME_STORAGE_KEY,
    applyAppThemeMode,
    readStoredAppThemeMode,
} from './theme';

const createLocalStorage = () => {
    const values = new Map<string, string>();

    return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
            values.set(key, value);
        },
    };
};

const createDocumentElement = (initialAttributes: Record<string, string> = {}) => {
    const attributes = new Map<string, string>(Object.entries(initialAttributes));

    return {
        attributes,
        getAttribute: (name: string) => attributes.get(name) ?? null,
        setAttribute: (name: string, value: string) => {
            attributes.set(name, value);
        },
        removeAttribute: (name: string) => {
            attributes.delete(name);
        },
    };
};

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('app theme persistence', () => {
    it.each([
        'light',
        'dark',
        'auto',
    ] as const)('stores %s mode in localStorage', mode => {
        const localStorage = createLocalStorage();

        vi.stubGlobal('window', {localStorage});
        vi.stubGlobal('document', {documentElement: createDocumentElement()});

        applyAppThemeMode(mode);

        expect(localStorage.getItem(APP_THEME_STORAGE_KEY)).toBe(mode);
        expect(readStoredAppThemeMode()).toBe(mode);
    });
});

describe('theme swap cross-fade', () => {
    type Environment = {
        documentElement: ReturnType<typeof createDocumentElement>,
        startViewTransition: ReturnType<typeof vi.fn>,
    };

    const stubEnvironment = (options: {
        documentTheme?: string,
        reducedMotion?: boolean,
        viewTransitions?: boolean,
    } = {}): Environment => {
        const {
            documentTheme,
            reducedMotion = false,
            viewTransitions = true,
        } = options;
        const documentElement = createDocumentElement(documentTheme ? {'data-theme': documentTheme} : {});
        /* Runs the callback straight away, the way the browser does — one frame later. */
        const startViewTransition = vi.fn((callback: () => void) => {
            callback();

            return {};
        });

        vi.stubGlobal('window', {
            localStorage: createLocalStorage(),
            matchMedia: (query: string) => ({matches: query.includes('reduced-motion') && reducedMotion}),
        });
        vi.stubGlobal('document', viewTransitions
            ? {documentElement, startViewTransition}
            : {documentElement});

        return {documentElement, startViewTransition};
    };

    it('routes a real light↔dark change through a view transition', () => {
        const {documentElement, startViewTransition} = stubEnvironment({documentTheme: 'light'});

        applyAppThemeMode('dark');

        expect(startViewTransition).toHaveBeenCalledOnce();
        expect(documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('leaves the attributes to the transition callback, not to the call itself', () => {
        const {documentElement, startViewTransition} = stubEnvironment({documentTheme: 'light'});

        startViewTransition.mockImplementation(() => ({}));
        applyAppThemeMode('dark');

        expect(documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('swaps instantly on the first paint, which has no theme to fade from', () => {
        const {documentElement, startViewTransition} = stubEnvironment();

        applyAppThemeMode('dark');

        expect(startViewTransition).not.toHaveBeenCalled();
        expect(documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('swaps instantly when the mode change resolves to the same theme', () => {
        const {documentElement, startViewTransition} = stubEnvironment({documentTheme: 'light'});

        applyAppThemeMode('auto');

        expect(startViewTransition).not.toHaveBeenCalled();
        expect(documentElement.getAttribute('data-theme-mode')).toBe('auto');
    });

    it('swaps instantly for a user who asked for less motion', () => {
        const {documentElement, startViewTransition} = stubEnvironment({documentTheme: 'light', reducedMotion: true});

        applyAppThemeMode('dark');

        expect(startViewTransition).not.toHaveBeenCalled();
        expect(documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('swaps instantly in a browser without view transitions', () => {
        const {documentElement} = stubEnvironment({documentTheme: 'light', viewTransitions: false});

        applyAppThemeMode('dark');

        expect(documentElement.getAttribute('data-theme')).toBe('dark');
    });
});
