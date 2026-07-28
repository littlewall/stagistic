const TOKENS = [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
] as const;

export const toLowerRoman = (value: number): string => {
    if (!Number.isInteger(value) || value < 1) {
        throw new RangeError('Roman page numbers require a positive integer.');
    }

    let remaining = value;
    let result = '';

    TOKENS.forEach(([numeric, roman]) => {
        while (remaining >= numeric) {
            result += roman;
            remaining -= numeric;
        }
    });

    return result;
};
