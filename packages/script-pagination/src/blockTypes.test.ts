import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    isOrphanCandidateBlockType,
    isSplittableBlockType,
    MIN_SPLIT_LINES_AFTER,
    MIN_SPLIT_LINES_BEFORE,
} from './blockTypes';

describe('block-type classification', () => {
    it('treats prose blocks as splittable', () => {
        expect(isSplittableBlockType('dialogue')).toBe(true);
        expect(isSplittableBlockType('stageDirection')).toBe(true);
        expect(isSplittableBlockType('lyrics')).toBe(true);
        expect(isSplittableBlockType('aside')).toBe(true);
    });

    it('treats headings as non-splittable orphan candidates', () => {
        expect(isSplittableBlockType('character')).toBe(false);
        expect(isSplittableBlockType('scene')).toBe(false);
        expect(isOrphanCandidateBlockType('character')).toBe(true);
        expect(isOrphanCandidateBlockType('scene')).toBe(true);
        expect(isOrphanCandidateBlockType('dialogue')).toBe(false);
    });

    it('handles undefined block types safely', () => {
        expect(isSplittableBlockType(undefined)).toBe(false);
        expect(isOrphanCandidateBlockType(undefined)).toBe(false);
    });

    it('pins the widow/orphan minimums', () => {
        expect(MIN_SPLIT_LINES_BEFORE).toBe(2);
        expect(MIN_SPLIT_LINES_AFTER).toBe(2);
    });
});
