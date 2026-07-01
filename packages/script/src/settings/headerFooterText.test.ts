import {
    describe, expect, it,
} from 'vite-plus/test';

import {toRoman} from './headerFooterText';

describe('toRoman', () => {
    it('converts common act numbers', () => {
        expect(toRoman(1)).toBe('I');
        expect(toRoman(2)).toBe('II');
        expect(toRoman(4)).toBe('IV');
        expect(toRoman(9)).toBe('IX');
        expect(toRoman(14)).toBe('XIV');
    });

    it('returns an empty string for non-positive input', () => {
        expect(toRoman(0)).toBe('');
        expect(toRoman(-3)).toBe('');
    });
});
