import {
    describe, expect, it,
} from 'vite-plus/test';

import {clampNumber} from './number';

describe('clampNumber', () => {
    it('returns the value when within range', () => {
        expect(clampNumber(5, 0, 10)).toBe(5);
    });

    it('clamps to the bounds', () => {
        expect(clampNumber(-5, 0, 10)).toBe(0);
        expect(clampNumber(15, 0, 10)).toBe(10);
    });

    it('returns the boundary values unchanged', () => {
        expect(clampNumber(0, 0, 10)).toBe(0);
        expect(clampNumber(10, 0, 10)).toBe(10);
    });

    it('normalizes reversed min/max bounds', () => {
        expect(clampNumber(5, 10, 0)).toBe(5);
        expect(clampNumber(15, 10, 0)).toBe(10);
        expect(clampNumber(-5, 10, 0)).toBe(0);
    });
});
