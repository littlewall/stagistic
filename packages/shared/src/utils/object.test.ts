import {
    describe, expect, it,
} from 'vite-plus/test';

import {isObjectRecord} from './object';

describe('isObjectRecord', () => {
    it('accepts plain objects', () => {
        expect(isObjectRecord({})).toBe(true);
        expect(isObjectRecord({a: 1})).toBe(true);
    });

    it('rejects arrays', () => {
        expect(isObjectRecord([])).toBe(false);
        expect(isObjectRecord([1, 2])).toBe(false);
    });

    it('rejects null and undefined', () => {
        expect(isObjectRecord(null)).toBe(false);
        expect(isObjectRecord(undefined)).toBe(false);
    });

    it('rejects primitives', () => {
        expect(isObjectRecord(42)).toBe(false);
        expect(isObjectRecord('x')).toBe(false);
        expect(isObjectRecord(true)).toBe(false);
    });
});
