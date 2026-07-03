import {describe, expect, it} from 'vite-plus/test';

import {DEFAULT_OPTIONS} from './constants';
import {arePaginationSettingsApplied} from './settingsEqual';

describe('arePaginationSettingsApplied', () => {
    it('returns true for an identical subset', () => {
        expect(arePaginationSettingsApplied(DEFAULT_OPTIONS, {
            pageHeight: DEFAULT_OPTIONS.pageHeight,
            marginTop: DEFAULT_OPTIONS.marginTop,
        })).toBe(true);
    });

    it('returns true for an empty update', () => {
        expect(arePaginationSettingsApplied(DEFAULT_OPTIONS, {})).toBe(true);
    });

    it('returns false when any value differs', () => {
        expect(arePaginationSettingsApplied(DEFAULT_OPTIONS, {
            pageHeight: DEFAULT_OPTIONS.pageHeight,
            marginTop: DEFAULT_OPTIONS.marginTop + 1,
        })).toBe(false);
    });
});
