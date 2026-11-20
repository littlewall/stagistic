import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {attemptQuietReload, type QuietReloadConditions} from './quietReload';

const calm: QuietReloadConditions = {
    hasUnsavedWork: false,
    hasOpenDialog: false,
    isHandoverIdle: true,
    hasRuntimeFileFailure: false,
};

const createStorage = (initial: Record<string, string> = {}) => {
    const items = new Map(Object.entries(initial));

    return {
        getItem: (key: string) => items.get(key) ?? null,
        setItem: (key: string, value: string) => void items.set(key, value),
    };
};

describe('quiet reload', () => {
    it('reloads when nothing needs the writer\'s attention', () => {
        const reload = vi.fn();

        expect(attemptQuietReload({
            release: '0.3.0',
            conditions: calm,
            storage: createStorage(),
            reload,
        })).toBe(true);
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it.each<[string, Partial<QuietReloadConditions>]>([
        ['text is unsaved', {hasUnsavedWork: true}],
        ['a dialog is open', {hasOpenDialog: true}],
        ['a database handover is under way', {isHandoverIdle: false}],
        ['a runtime file failure is showing', {hasRuntimeFileFailure: true}],
    ])('does not reload while %s', (_name, override) => {
        const reload = vi.fn();
        const storage = createStorage();

        expect(attemptQuietReload({
            release: '0.3.0',
            conditions: {...calm, ...override},
            storage,
            reload,
        })).toBe(false);
        expect(reload).not.toHaveBeenCalled();

        // A blocked attempt is not used up: the next return to the list may reload.
        expect(attemptQuietReload({
            release: '0.3.0',
            conditions: calm,
            storage,
            reload,
        })).toBe(true);
    });

    it('reloads at most once per Release, so a stale cache cannot cause a loop', () => {
        const reload = vi.fn();
        const storage = createStorage();
        const attempt = (release: string) => attemptQuietReload({
            release,
            conditions: calm,
            storage,
            reload,
        });

        expect(attempt('0.3.0')).toBe(true);
        // After the reload the tab is still the old build and finds the same Release again.
        expect(attempt('0.3.0')).toBe(false);
        expect(reload).toHaveBeenCalledTimes(1);

        expect(attempt('0.4.0')).toBe(true);
        expect(reload).toHaveBeenCalledTimes(2);
    });

    it('does not reload when the attempt cannot be remembered', () => {
        const reload = vi.fn();
        const unwritable = {
            getItem: () => null,
            setItem: () => {
                throw new Error('QuotaExceededError');
            },
        };
        const unreadable = {
            getItem: () => {
                throw new Error('SecurityError');
            },
            setItem: () => {},
        };

        for (const storage of [
            unwritable,
            unreadable,
            null,
        ]) {
            expect(attemptQuietReload({
                release: '0.3.0',
                conditions: calm,
                storage,
                reload,
            })).toBe(false);
        }

        expect(reload).not.toHaveBeenCalled();
    });
});
