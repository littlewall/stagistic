import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {structuralValueEquals} from './structuralEquals';

describe('structuralValueEquals', () => {
    it('compares scalars with Object.is semantics', () => {
        expect(structuralValueEquals('a', 'a')).toBe(true);
        expect(structuralValueEquals(1, 2)).toBe(false);
        expect(structuralValueEquals(Number.NaN, Number.NaN)).toBe(true);
        expect(structuralValueEquals(null, undefined)).toBe(false);
        expect(structuralValueEquals(null, null)).toBe(true);
    });

    it('ignores object key order', () => {
        expect(structuralValueEquals(
            {a: 1, b: {c: 2, d: 3}},
            {b: {d: 3, c: 2}, a: 1},
        )).toBe(true);
    });

    it('treats undefined members and empty objects as absent', () => {
        expect(structuralValueEquals({a: 1, b: undefined}, {a: 1})).toBe(true);
        expect(structuralValueEquals({a: 1, typography: {}}, {a: 1})).toBe(true);
        expect(structuralValueEquals({a: {b: {}}}, {})).toBe(true);
        expect(structuralValueEquals({}, undefined)).toBe(true);
        expect(structuralValueEquals({a: null}, {})).toBe(false);
    });

    it('compares arrays element-wise without absence collapsing', () => {
        expect(structuralValueEquals([1, {a: 2}], [1, {a: 2}])).toBe(true);
        expect(structuralValueEquals([1, 2], [2, 1])).toBe(false);
        expect(structuralValueEquals([], {})).toBe(false);
        expect(structuralValueEquals([{}], [{}])).toBe(true);
    });

    it('rejects differing values', () => {
        expect(structuralValueEquals({a: 1}, {a: 2})).toBe(false);
        expect(structuralValueEquals({a: 1}, {a: 1, b: 2})).toBe(false);
    });
});
