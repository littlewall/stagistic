import {
    describe, expect, it,
} from 'vitest';

import {getEnterFallback} from './enterFallback';

describe('enter fallback chain', () => {
    it('follows the speech chain', () => {
        expect(getEnterFallback('character')).toBe('dialogue');
        expect(getEnterFallback('dialogue')).toBe('character');
        expect(getEnterFallback('aside')).toBe('character');
        expect(getEnterFallback('lyrics')).toBe('lyrics');
        expect(getEnterFallback('act')).toBe('scene');
        expect(getEnterFallback('scene')).toBe('stageDirection');
        expect(getEnterFallback('note')).toBe('stageDirection');
    });
});
