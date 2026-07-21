import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    formatMusicNumber, formatMusicOutLabel,
    musicLetter,
} from './format';

describe('music formatters', () => {
    it('formats a lone music in a scene as the scene number', () => {
        expect(formatMusicNumber({
            sceneNumber: 3, indexInScene: 0, sceneMusicCount: 1,
        })).toBe('3)');
    });

    it('appends a letter when a scene holds more than one music', () => {
        expect(formatMusicNumber({
            sceneNumber: 3, indexInScene: 0, sceneMusicCount: 2,
        })).toBe('3.A)');
        expect(formatMusicNumber({
            sceneNumber: 3, indexInScene: 1, sceneMusicCount: 2,
        })).toBe('3.B)');
    });

    it('continues letters past Z', () => {
        expect(musicLetter(25)).toBe('Z');
        expect(musicLetter(26)).toBe('AA');
    });

    it('formats an out as "<number> out (title)", dropping empty parens', () => {
        expect(formatMusicOutLabel({
            sceneNumber: 3, indexInScene: 0, sceneMusicCount: 2, title: 'Night',
        })).toBe('3.A) out (Night)');
        expect(formatMusicOutLabel({
            sceneNumber: 3, indexInScene: 0, sceneMusicCount: 1, title: '',
        })).toBe('3) out');
    });
});
