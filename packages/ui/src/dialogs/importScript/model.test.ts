import {describe, expect, it} from 'vite-plus/test';

import {classifyFileKind, getFileBaseName, isStagisticFileName, isStepkgFileName} from './model';

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

describe('Stepkg import file model', () => {
    it('accepts only .stepkg files case-insensitively', () => {
        expect(isStepkgFileName('play.stepkg')).toBe(true);
        expect(isStepkgFileName('PLAY.STEPKG')).toBe(true);
        expect(isStepkgFileName('play.stagistic')).toBe(false);
    });

    it('derives the default script name from a .stepkg file name', () => {
        expect(getFileBaseName('When Night Falls.stepkg')).toBe('When Night Falls');
    });

    it('classifies file kinds by extension, or null for unsupported files', () => {
        expect(classifyFileKind('play.stagistic')).toBe('stagistic');
        expect(classifyFileKind('play.stepkg')).toBe('stepkg');
        expect(classifyFileKind('play.fountain')).toBeNull();
    });
});
