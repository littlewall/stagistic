import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    formatPitch,
    parsePitch,
    pitchToMidi,
} from './pitch';

describe('parsePitch', () => {
    it('parses a natural note', () => {
        expect(parsePitch('C4')).toEqual({
            step: 'C', alter: 0, octave: 4,
        });
    });

    it('parses a sharp', () => {
        expect(parsePitch('F#3')).toEqual({
            step: 'F', alter: 1, octave: 3,
        });
    });

    it('parses a flat', () => {
        expect(parsePitch('Bb2')).toEqual({
            step: 'B', alter: -1, octave: 2,
        });
    });

    it('rejects malformed input', () => {
        expect(parsePitch('H4')).toBeNull();
        expect(parsePitch('C')).toBeNull();
        expect(parsePitch('')).toBeNull();
    });
});

describe('formatPitch', () => {
    it('round-trips', () => {
        for (const spn of [
            'C4',
            'F#3',
            'Bb2',
            'A5',
        ]) {
            expect(formatPitch(parsePitch(spn)!)).toBe(spn);
        }
    });
});

describe('pitchToMidi', () => {
    it('places middle C at 60', () => {
        expect(pitchToMidi({
            step: 'C', alter: 0, octave: 4,
        })).toBe(60);
    });

    it('orders low below high', () => {
        expect(pitchToMidi(parsePitch('F#3')!)).toBeLessThan(pitchToMidi(parsePitch('Bb4')!));
    });

    it('treats enharmonics as equal semitone', () => {
        expect(pitchToMidi(parsePitch('A#3')!)).toBe(pitchToMidi(parsePitch('Bb3')!));
    });
});
