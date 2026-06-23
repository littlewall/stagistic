import {
    describe, expect, it,
} from 'vite-plus/test';

import {DEFAULT_EDITOR_SETTINGS} from '../settings';
import {
    getDefaultActName, normalizeActName, resolveStructureSettings,
} from './structureUtils';

describe('normalizeActName', () => {
    it('trims surrounding whitespace', () => {
        expect(normalizeActName('  ACT I  ')).toBe('ACT I');
    });

    it('collapses a whitespace-only name to an empty string', () => {
        expect(normalizeActName('   ')).toBe('');
    });
});

describe('getDefaultActName', () => {
    it('formats the index as "ACT n"', () => {
        expect(getDefaultActName(1)).toBe('ACT 1');
        expect(getDefaultActName(3)).toBe('ACT 3');
    });
});

describe('resolveStructureSettings', () => {
    it('returns the defaults when nothing is provided', () => {
        expect(resolveStructureSettings()).toEqual(DEFAULT_EDITOR_SETTINGS.structure);
    });

    it('fills missing fields from the defaults', () => {
        const result = resolveStructureSettings({actDisplay: {linesBefore: 5}});

        expect(result.actDisplay.linesBefore).toBe(5);
        expect(result.actDisplay.linesAfter)
            .toBe(DEFAULT_EDITOR_SETTINGS.structure.actDisplay.linesAfter);
    });

    it('preserves an explicit zero rather than falling back', () => {
        const result = resolveStructureSettings({actDisplay: {linesBefore: 0, linesAfter: 0}});

        expect(result.actDisplay.linesBefore).toBe(0);
        expect(result.actDisplay.linesAfter).toBe(0);
    });
});
