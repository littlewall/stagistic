import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    collapseWhitespace,
    splitTrailingParentheticalSuffix,
    trimOrFallback,
} from './string';

describe('collapseWhitespace', () => {
    it('collapses runs of whitespace and trims the ends', () => {
        expect(collapseWhitespace('  a   b  ')).toBe('a b');
        expect(collapseWhitespace('a\t\nb')).toBe('a b');
    });

    it('returns an empty string for whitespace-only input', () => {
        expect(collapseWhitespace('   ')).toBe('');
    });
});

describe('trimOrFallback', () => {
    it('returns the trimmed value when it is non-empty', () => {
        expect(trimOrFallback('  hi  ', 'fb')).toBe('hi');
    });

    it('returns the fallback for empty or whitespace-only input', () => {
        expect(trimOrFallback('   ', 'fb')).toBe('fb');
        expect(trimOrFallback('', 'fb')).toBe('fb');
    });
});

describe('splitTrailingParentheticalSuffix', () => {
    it('splits a single trailing parenthetical', () => {
        expect(splitTrailingParentheticalSuffix('ANNA (cont\'d)')).toEqual({
            base: 'ANNA',
            suffix: '(cont\'d)',
        });
    });

    it('captures multiple trailing parentheticals as one suffix', () => {
        expect(splitTrailingParentheticalSuffix('ANNA (V.O.) (CONT)')).toEqual({
            base: 'ANNA',
            suffix: '(V.O.) (CONT)',
        });
    });

    it('returns an empty suffix when there is none', () => {
        expect(splitTrailingParentheticalSuffix('ANNA')).toEqual({base: 'ANNA', suffix: ''});
    });

    it('handles a value that is only a parenthetical', () => {
        expect(splitTrailingParentheticalSuffix('(only)')).toEqual({base: '', suffix: '(only)'});
    });

    it('trims surrounding whitespace before splitting', () => {
        expect(splitTrailingParentheticalSuffix('  BOB (whisper)  ')).toEqual({
            base: 'BOB',
            suffix: '(whisper)',
        });
    });
});
