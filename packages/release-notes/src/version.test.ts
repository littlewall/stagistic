import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    bumpRelease,
    compareReleaseNumbers,
    highestBump,
} from './index';

describe('release numbers', () => {
    it('a minor bump resets the patch number', () => {
        expect(bumpRelease('0.1.4', 'minor')).toBe('0.2.0');
    });

    it('a patch bump keeps the minor number', () => {
        expect(bumpRelease('0.2.0', 'patch')).toBe('0.2.1');
    });

    it('rejects a malformed number', () => {
        expect(() => bumpRelease('0.2', 'minor')).toThrow(/release number/i);
    });

    it('the highest bump wins', () => {
        expect(highestBump([
            'patch',
            'minor',
            'patch',
        ])).toBe('minor');
        expect(highestBump(['patch', 'patch'])).toBe('patch');
    });

    it('compares numerically, not as text', () => {
        expect(compareReleaseNumbers('0.10.0', '0.9.0')).toBeGreaterThan(0);
        expect(compareReleaseNumbers('0.2.0', '0.2.0')).toBe(0);
        expect(compareReleaseNumbers('0.2.0', '0.2.1')).toBeLessThan(0);
    });
});
