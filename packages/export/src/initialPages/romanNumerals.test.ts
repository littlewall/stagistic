import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {toLowerRoman} from './romanNumerals';

describe('toLowerRoman', () => {
    it('converts positive integers to lowercase Roman numerals', () => {
        expect([
            1,
            2,
            3,
            4,
            5,
            9,
            10,
            14,
            40,
            49,
        ].map(toLowerRoman)).toEqual([
            'i',
            'ii',
            'iii',
            'iv',
            'v',
            'ix',
            'x',
            'xiv',
            'xl',
            'xlix',
        ]);
    });

    it('rejects values outside the supported sequence', () => {
        expect(() => toLowerRoman(0)).toThrow();
        expect(() => toLowerRoman(1.5)).toThrow();
    });
});
