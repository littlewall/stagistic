const ROMAN_NUMERALS: ReadonlyArray<readonly [number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
];

export const toRoman = (value: number): string => {
    let remaining = Math.floor(value);

    if (remaining <= 0) {
        return '';
    }

    let result = '';

    for (const [numeral, symbol] of ROMAN_NUMERALS) {
        while (remaining >= numeral) {
            result += symbol;
            remaining -= numeral;
        }
    }

    return result;
};

export interface PageMarkParts {
    actIndex: number | null,
    sceneNumber: number,
    pageNumber: number,
}

export const buildPageMark = ({
    actIndex, sceneNumber, pageNumber,
}: PageMarkParts): string => {
    const scene = Math.max(1, sceneNumber);

    if (actIndex == null || actIndex <= 0) {
        return `${scene}-${pageNumber}`;
    }

    return `${toRoman(actIndex)}-${scene}-${pageNumber}`;
};
