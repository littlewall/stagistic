import {
    describe, expect, it,
} from 'vite-plus/test';

import {parsePitch} from './pitch';
import {
    ledgerPositions,
    pickClef,
    positionToPitch,
    staffPosition,
} from './staff';

const p = (spn: string) => parsePitch(spn)!;

describe('pickClef', () => {
    it('uses treble for a high-centred (soprano) range', () => {
        expect(pickClef(p('C4'), p('C6'))).toBe('treble');
    });

    it('uses treble-8vb for a low-centred (tenor/baritone) range', () => {
        expect(pickClef(p('C3'), p('G4'))).toBe('treble-8vb');
    });
});

describe('staffPosition (treble)', () => {
    it('places E4 on the bottom line', () => {
        expect(staffPosition(p('E4'), 'treble')).toBe(0);
    });

    it('places F5 on the top line', () => {
        expect(staffPosition(p('F5'), 'treble')).toBe(8);
    });

    it('places middle C4 two positions below the staff', () => {
        expect(staffPosition(p('C4'), 'treble')).toBe(-2);
    });

    it('ignores accidental for vertical placement', () => {
        expect(staffPosition(p('F#4'), 'treble')).toBe(staffPosition(p('F4'), 'treble'));
    });
});

describe('staffPosition (treble-8vb) notates one octave higher than it sounds', () => {
    it('places E3 on the bottom line', () => {
        expect(staffPosition(p('E3'), 'treble-8vb')).toBe(0);
    });
});

describe('positionToPitch', () => {
    it('inverts staffPosition for the bottom line (treble)', () => {
        expect(positionToPitch(0, 'treble', 0)).toEqual(p('E4'));
    });

    it('inverts staffPosition for middle C (treble)', () => {
        expect(positionToPitch(-2, 'treble', 0)).toEqual(p('C4'));
    });

    it('inverts staffPosition for the top line (treble)', () => {
        expect(positionToPitch(8, 'treble', 0)).toEqual(p('F5'));
    });

    it('inverts staffPosition for the bottom line (treble-8vb)', () => {
        expect(positionToPitch(0, 'treble-8vb', 0)).toEqual(p('E3'));
    });

    it('applies the requested accidental', () => {
        expect(positionToPitch(8, 'treble', 1)).toEqual(p('F#5'));
        expect(positionToPitch(8, 'treble', -1)).toEqual(p('Fb5'));
    });

    it('round-trips through staffPosition across a wide range', () => {
        for (const spn of [
            'C2',
            'F#3',
            'Bb3',
            'E4',
            'A5',
            'C6',
        ]) {
            const pitch = p(spn);
            const clef = pitch.octave <= 3 ? 'treble-8vb' : 'treble';

            expect(positionToPitch(staffPosition(pitch, clef), clef, pitch.alter)).toEqual(pitch);
        }
    });

    it('handles positions below the reference octave', () => {
        expect(positionToPitch(-16, 'treble', 0)).toEqual(p('C2'));
    });
});

describe('ledgerPositions', () => {
    it('is empty inside the staff', () => {
        expect(ledgerPositions(4)).toEqual([]);
    });

    it('draws below-staff ledgers down to the note', () => {
        expect(ledgerPositions(-2)).toEqual([-2]);
        expect(ledgerPositions(-4)).toEqual([-2, -4]);
    });

    it('draws above-staff ledgers up to the note', () => {
        expect(ledgerPositions(10)).toEqual([10]);
    });
});
