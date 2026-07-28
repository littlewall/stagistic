import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    getFileBaseName,
    isStagisticFileName,
} from './model';

describe('Stagistic import file model', () => {
    it('accepts only .stagistic files case-insensitively', () => {
        expect(isStagisticFileName('play.stagistic')).toBe(true);
        expect(isStagisticFileName('PLAY.STAGISTIC')).toBe(true);
        expect(isStagisticFileName('play.fountain')).toBe(false);
        expect(isStagisticFileName('play.stagistic.txt')).toBe(false);
    });

    it('derives the default script name from the file name', () => {
        expect(getFileBaseName('When Night Falls.stagistic')).toBe('When Night Falls');
    });
});
