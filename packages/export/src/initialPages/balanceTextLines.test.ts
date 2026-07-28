import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {balanceTextLines} from './balanceTextLines';

describe('balanceTextLines', () => {
    it('balances words across the minimum number of lines', () => {
        expect(balanceTextLines(
            'One two three four five six',
            18,
        )).toEqual(['One two three', 'four five six']);
    });

    it('keeps every balanced line within the maximum width', () => {
        const lines = balanceTextLines(
            'A detailed description of a character with a complicated history',
            22,
        );

        expect(lines.every(line => line.length <= 22)).toBe(true);
    });

    it('splits a single word that is wider than the available line', () => {
        expect(balanceTextLines('Extraordinary', 5)).toEqual([
            'Extra',
            'ordin',
            'ary',
        ]);
    });
});
