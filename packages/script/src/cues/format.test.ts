import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    cueLetter, formatCueNumber, formatOutLabel,
} from './format';

describe('cue formatters', () => {
    it('formats a lone cue in a scene as the scene number', () => {
        expect(formatCueNumber({
            sceneNumber: 3, indexInScene: 0, sceneCueCount: 1,
        })).toBe('3.');
    });

    it('appends a letter when a scene holds more than one cue', () => {
        expect(formatCueNumber({
            sceneNumber: 3, indexInScene: 0, sceneCueCount: 2,
        })).toBe('3.A');
        expect(formatCueNumber({
            sceneNumber: 3, indexInScene: 1, sceneCueCount: 2,
        })).toBe('3.B');
    });

    it('continues letters past Z', () => {
        expect(cueLetter(25)).toBe('Z');
        expect(cueLetter(26)).toBe('AA');
    });

    it('formats an out as "<number> out (title)", dropping empty parens', () => {
        expect(formatOutLabel({
            sceneNumber: 3, indexInScene: 0, sceneCueCount: 2, title: 'Night',
        })).toBe('3.A out (Night)');
        expect(formatOutLabel({
            sceneNumber: 3, indexInScene: 0, sceneCueCount: 1, title: '',
        })).toBe('3. out');
    });
});
