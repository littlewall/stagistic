import {
    describe, expect, it,
} from 'vite-plus/test';

import {generateBlockOrdersBetween} from '../../queries';
import {computeOrderKeyAssignments} from './minimalOrderKeys';

const [
    k0,
    k1,
    k2,
    k3,
    k4,
] = generateBlockOrdersBetween(null, null, 5);

const baseline = (...entries: Array<[string, string]>) => new Map<string, string>(entries);

const orderByKey = (ids: string[], keyById: ReadonlyMap<string, string>): string[] => {
    const compare = (a: string, b: string): number => {
        const ka = keyById.get(a) ?? '';
        const kb = keyById.get(b) ?? '';

        if (ka < kb) {
            return -1;
        }

        if (ka > kb) {
            return 1;
        }

        return 0;
    };

    return [...ids].sort(compare);
};

describe('computeOrderKeyAssignments', () => {
    it('returns null for an empty baseline', () => {
        expect(computeOrderKeyAssignments(['a'], new Map())).toBeNull();
    });

    it('returns null when two ordered blocks share a baseline key', () => {
        const result = computeOrderKeyAssignments(['a', 'b'], baseline(['a', k0], ['b', k0]));

        expect(result).toBeNull();
    });

    it('makes no changes when the blocks are already in key order', () => {
        const base = baseline(['a', k0], ['b', k1], ['c', k2], ['d', k3], ['e', k4]);

        const result = computeOrderKeyAssignments([
            'a',
            'b',
            'c',
            'd',
            'e',
        ], base);

        expect(result).not.toBeNull();
        expect(result?.changed).toEqual([]);
        expect(result?.keyById.get('a')).toBe(k0);
        expect(result?.keyById.get('e')).toBe(k4);
    });

    it('re-keys only the moved block and yields the target order', () => {
        const base = baseline(['a', k0], ['b', k1], ['c', k2], ['d', k3], ['e', k4]);
        const target = [
            'a',
            'c',
            'b',
            'd',
            'e',
        ];

        const result = computeOrderKeyAssignments(target, base);

        expect(result).not.toBeNull();
        expect(result?.changed).toHaveLength(1);
        expect(orderByKey(target, result?.keyById ?? new Map())).toEqual(target);
    });

    it('assigns fresh keys to new blocks while keeping the existing ones', () => {
        const base = baseline(['a', k0], ['b', k1], ['c', k2], ['d', k3], ['e', k4]);
        const target = [
            'a',
            'x',
            'b',
            'c',
            'd',
            'e',
        ];

        const result = computeOrderKeyAssignments(target, base);

        expect(result).not.toBeNull();
        expect(result?.changed.map(c => c.id)).toEqual(['x']);
        expect(result?.keyById.get('a')).toBe(k0);
        expect(result?.keyById.get('b')).toBe(k1);
        expect(orderByKey(target, result?.keyById ?? new Map())).toEqual(target);

        const xKey = result?.keyById.get('x') ?? '';

        expect(xKey > k0 && xKey < k1).toBe(true);
    });

    it('re-keys all but one anchor when the order is fully reversed', () => {
        const base = baseline(['a', k0], ['b', k1], ['c', k2], ['d', k3], ['e', k4]);
        const target = [
            'e',
            'd',
            'c',
            'b',
            'a',
        ];

        const result = computeOrderKeyAssignments(target, base);

        expect(result).not.toBeNull();
        expect(result?.changed).toHaveLength(4);
        expect(orderByKey(target, result?.keyById ?? new Map())).toEqual(target);
    });
});
