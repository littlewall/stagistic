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

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('app theme persistence', () => {
    it.each([
        'light',
        'dark',
        'auto',
    ] as const)('stores %s mode in localStorage', mode => {
        const localStorage = createLocalStorage();

        vi.stubGlobal('window', {localStorage});
        vi.stubGlobal('document', {
            documentElement: {
                setAttribute: vi.fn(),
            },
        });

        applyAppThemeMode(mode);

        expect(localStorage.getItem(APP_THEME_STORAGE_KEY)).toBe(mode);
        expect(readStoredAppThemeMode()).toBe(mode);
    });
});
