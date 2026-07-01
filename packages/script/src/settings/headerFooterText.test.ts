import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    buildPageMark,
    toRoman,
} from './headerFooterText';

describe('toRoman', () => {
    it('converts common act numbers', () => {
        expect(toRoman(1)).toBe('I');
        expect(toRoman(2)).toBe('II');
        expect(toRoman(4)).toBe('IV');
        expect(toRoman(9)).toBe('IX');
        expect(toRoman(14)).toBe('XIV');
    });

    it('returns an empty string for non-positive input', () => {
        expect(toRoman(0)).toBe('');
        expect(toRoman(-3)).toBe('');
    });
});

describe('buildPageMark', () => {
    it('formats act-scene-page with a Roman act', () => {
        expect(buildPageMark({
            actIndex: 1, sceneNumber: 1, pageNumber: 1,
        })).toBe('I-1-1');
        expect(buildPageMark({
            actIndex: 2, sceneNumber: 3, pageNumber: 12,
        })).toBe('II-3-12');
    });

    it('omits the act component when there is no act', () => {
        expect(buildPageMark({
            actIndex: null, sceneNumber: 1, pageNumber: 1,
        })).toBe('1-1');
        expect(buildPageMark({
            actIndex: 0, sceneNumber: 2, pageNumber: 5,
        })).toBe('2-5');
    });

    it('clamps the scene component to at least 1', () => {
        expect(buildPageMark({
            actIndex: null, sceneNumber: 0, pageNumber: 3,
        })).toBe('1-3');
    });
});
