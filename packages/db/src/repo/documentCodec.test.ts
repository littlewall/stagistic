import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    fromMillis, parseJson, toMillis,
} from './documentCodec';

describe('toMillis', () => {
    it('converts seconds to rounded milliseconds', () => {
        expect(toMillis(1.5)).toBe(1500);
        expect(toMillis(0)).toBe(0);
        expect(toMillis(-2)).toBe(-2000);
    });

    it('rounds to the nearest millisecond', () => {
        expect(toMillis(1.0001)).toBe(1000);
        expect(toMillis(1.9999)).toBe(2000);
    });

    it('returns null for non-numeric input', () => {
        expect(toMillis(undefined)).toBeNull();
    });
});

describe('fromMillis', () => {
    it('converts milliseconds back to seconds', () => {
        expect(fromMillis(1500)).toBe(1.5);
        expect(fromMillis(0)).toBe(0);
    });

    it('returns undefined for null or undefined', () => {
        expect(fromMillis(null)).toBeUndefined();
        expect(fromMillis(undefined)).toBeUndefined();
    });

    it('round-trips with toMillis', () => {
        expect(fromMillis(toMillis(1.5))).toBe(1.5);
    });
});

describe('parseJson', () => {
    it('parses valid JSON', () => {
        expect(parseJson('{"a":1}')).toEqual({a: 1});
        expect(parseJson('[1,2,3]')).toEqual([
            1,
            2,
            3,
        ]);
        expect(parseJson('"hi"')).toBe('hi');
    });

    it('returns null for invalid JSON', () => {
        expect(parseJson('not json')).toBeNull();
        expect(parseJson('')).toBeNull();
    });

    it('returns null for the literal null', () => {
        expect(parseJson('null')).toBeNull();
    });
});
