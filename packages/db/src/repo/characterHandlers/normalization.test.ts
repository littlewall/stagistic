import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    DEFAULT_GENDER_LABEL_BY_KEY,
    normalizeGenderKey,
    normalizeGenderLabel,
} from './normalization';

describe('normalizeGenderLabel', () => {
    it('trims and collapses whitespace while preserving case', () => {
        expect(normalizeGenderLabel('  Male  ')).toBe('Male');
        expect(normalizeGenderLabel('Non   Binary')).toBe('Non Binary');
    });
});

describe('normalizeGenderKey', () => {
    it('lowercases the collapsed label', () => {
        expect(normalizeGenderKey('Male')).toBe('male');
        expect(normalizeGenderKey('  FE Male ')).toBe('fe male');
    });
});

describe('DEFAULT_GENDER_LABEL_BY_KEY', () => {
    it('maps the built-in gender keys to their display labels', () => {
        expect(DEFAULT_GENDER_LABEL_BY_KEY.get('male')).toBe('Male');
        expect(DEFAULT_GENDER_LABEL_BY_KEY.get('female')).toBe('Female');
        expect(DEFAULT_GENDER_LABEL_BY_KEY.size).toBe(2);
    });
});
