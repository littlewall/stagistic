import {
    afterEach, describe, expect, it, vi,
} from 'vite-plus/test';

import {isApplePlatform} from './platform';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('isApplePlatform', () => {
    it('detects apple hardware via navigator.platform', () => {
        vi.stubGlobal('navigator', {platform: 'MacIntel', userAgent: ''});

        expect(isApplePlatform()).toBe(true);
    });

    it('falls back to the user agent when platform is empty', () => {
        vi.stubGlobal('navigator', {platform: '', userAgent: 'iPhone'});

        expect(isApplePlatform()).toBe(true);
    });

    it('returns false for non-apple platforms', () => {
        vi.stubGlobal('navigator', {platform: 'Win32', userAgent: 'Windows'});

        expect(isApplePlatform()).toBe(false);
    });

    it('returns false when navigator is unavailable', () => {
        vi.stubGlobal('navigator', undefined);

        expect(isApplePlatform()).toBe(false);
    });
});
