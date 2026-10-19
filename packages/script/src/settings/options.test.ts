import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    formatSceneNumber,
    isBlockShortcut,
    isCharacterDecoration,
    isSceneNumberFormat,
} from './options';

describe('isBlockShortcut', () => {
    it('accepts the single-digit strings 0-9', () => {
        for (const digit of [
            '0',
            '1',
            '5',
            '9',
        ]) {
            expect(isBlockShortcut(digit)).toBe(true);
        }
    });

    it('rejects multi-character and non-digit strings', () => {
        expect(isBlockShortcut('10')).toBe(false);
        expect(isBlockShortcut('a')).toBe(false);
        expect(isBlockShortcut('')).toBe(false);
    });

    it('rejects non-string values', () => {
        expect(isBlockShortcut(5)).toBe(false);
        expect(isBlockShortcut(null)).toBe(false);
        expect(isBlockShortcut(undefined)).toBe(false);
        expect(isBlockShortcut({})).toBe(false);
    });
});

describe('isSceneNumberFormat', () => {
    it('accepts the known formats', () => {
        expect(isSceneNumberFormat('none')).toBe(true);
        expect(isSceneNumberFormat('dot')).toBe(true);
        expect(isSceneNumberFormat('paren')).toBe(true);
    });

    it('rejects unknown and non-string values', () => {
        expect(isSceneNumberFormat('bracket')).toBe(false);
        expect(isSceneNumberFormat('')).toBe(false);
        expect(isSceneNumberFormat(1)).toBe(false);
        expect(isSceneNumberFormat(null)).toBe(false);
        expect(isSceneNumberFormat(undefined)).toBe(false);
    });
});

describe('formatSceneNumber', () => {
    it('appends a period for the dot format', () => {
        expect(formatSceneNumber(3, 'dot')).toBe('3.');
    });

    it('appends a closing parenthesis for the paren format', () => {
        expect(formatSceneNumber(3, 'paren')).toBe('3)');
    });

    it('returns an empty label for the none format', () => {
        expect(formatSceneNumber(3, 'none')).toBe('');
    });

    it('defaults to the dot format', () => {
        expect(formatSceneNumber(7)).toBe('7.');
    });
});

describe('isCharacterDecoration', () => {
    it('accepts every decoration option', () => {
        for (const value of [
            'underline',
            'underline-tint',
            'underline-tint-lines',
            'none',
        ]) {
            expect(isCharacterDecoration(value)).toBe(true);
        }
    });

    it('rejects unknown values', () => {
        expect(isCharacterDecoration('fill')).toBe(false);
        expect(isCharacterDecoration(60)).toBe(false);
        expect(isCharacterDecoration(undefined)).toBe(false);
    });
});
