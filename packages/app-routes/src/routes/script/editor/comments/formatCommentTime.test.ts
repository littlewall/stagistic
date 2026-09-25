import {describe, expect, it} from 'vite-plus/test';

import {formatCommentTime} from './formatCommentTime';

const NOW = new Date(2026, 8, 24, 12).getTime();

describe('formatCommentTime', () => {
    it('uses compact relative units within a week', () => {
        expect(formatCommentTime(NOW - 10_000, NOW)).toBe('now');
        expect(formatCommentTime(NOW - 5 * 60_000, NOW)).toBe('5m ago');
        expect(formatCommentTime(NOW - 2 * 3_600_000, NOW)).toBe('2h ago');
        expect(formatCommentTime(NOW - 3 * 86_400_000, NOW)).toBe('3d ago');
    });

    it('falls back to a date, with the year only when it differs', () => {
        expect(formatCommentTime(new Date(2026, 8, 3).getTime(), NOW)).toBe('Sep 3');
        expect(formatCommentTime(new Date(2025, 8, 3).getTime(), NOW)).toBe('Sep 3, 2025');
    });
});
