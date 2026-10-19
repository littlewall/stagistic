import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {requireValue} from './requireValue';

describe('requireValue', () => {
    it('returns present values, including falsy values', () => {
        const value = {};

        expect(requireValue(value)).toBe(value);
        expect(requireValue(0)).toBe(0);
        expect(requireValue(false)).toBe(false);
        expect(requireValue('')).toBe('');
    });

    it('throws for null and undefined with the supplied context', () => {
        expect(() => requireValue(null)).toThrow('Expected a value');
        expect(() => requireValue(undefined, 'Missing script')).toThrow('Missing script');
    });
});
