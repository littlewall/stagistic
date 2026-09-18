import {describe, expect, it} from 'vite-plus/test';

import {
    CHARACTER_COLOR_SATURATION_DEFAULT,
    CHARACTER_COLOR_SATURATION_MAX,
    CHARACTER_COLOR_SATURATION_MIN,
    clampCharacterColorSaturation,
    formatSceneNumber,
    isBlockShortcut,
    isSceneNumberFormat,
} from './options';

describe('isBlockShortcut', () => {
    it('accepts the single-digit strings 0-9', () => {
        for (const digit of ['0', '1', '5', '9']) {
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

describe('clampCharacterColorSaturation', () => {
    it('rounds in-range values to the nearest integer', () => {
        expect(clampCharacterColorSaturation(45.4)).toBe(45);
        expect(clampCharacterColorSaturation(45.6)).toBe(46);
    });

    it('clamps below the minimum up to the minimum', () => {
        expect(clampCharacterColorSaturation(10)).toBe(CHARACTER_COLOR_SATURATION_MIN);
    });

    it('clamps above the maximum down to the maximum', () => {
        expect(clampCharacterColorSaturation(100)).toBe(CHARACTER_COLOR_SATURATION_MAX);
    });

    it('preserves the exact boundaries', () => {
        expect(clampCharacterColorSaturation(CHARACTER_COLOR_SATURATION_MIN)).toBe(CHARACTER_COLOR_SATURATION_MIN);
        expect(clampCharacterColorSaturation(CHARACTER_COLOR_SATURATION_MAX)).toBe(CHARACTER_COLOR_SATURATION_MAX);
    });

    it('falls back to the default for non-finite input', () => {
        expect(clampCharacterColorSaturation(Number.NaN)).toBe(CHARACTER_COLOR_SATURATION_DEFAULT);
        expect(clampCharacterColorSaturation(Number.POSITIVE_INFINITY)).toBe(CHARACTER_COLOR_SATURATION_DEFAULT);
        expect(clampCharacterColorSaturation(null)).toBe(CHARACTER_COLOR_SATURATION_DEFAULT);
        expect(clampCharacterColorSaturation(undefined)).toBe(CHARACTER_COLOR_SATURATION_DEFAULT);
    });
});
