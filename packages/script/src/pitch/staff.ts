import {pitchToMidi} from './pitch';
import type {
    Clef,
    Pitch,
} from './types';

const DIATONIC_INDEX: Record<Pitch['step'], number> = {
    C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6,
};
const STEP_BY_INDEX: Pitch['step'][] = [
    'C',
    'D',
    'E',
    'F',
    'G',
    'A',
    'B',
];

// Comfortable staff centres, as semitone (MIDI) values.
const CENTRE_MIDI: Record<Clef, number> = {
    treble: 71, // B4
    'treble-8vb': 59, // B3
};

// Diatonic ladder value: 7 steps per octave, monotonic with pitch height.
const diatonicLadder = (pitch: Pitch): number => pitch.octave * 7 + DIATONIC_INDEX[pitch.step];

export const pickClef = (low: Pitch, high: Pitch): Clef => {
    const mid = (pitchToMidi(low) + pitchToMidi(high)) / 2;

    return Math.abs(mid - CENTRE_MIDI.treble) <= Math.abs(mid - CENTRE_MIDI['treble-8vb'])
        ? 'treble'
        : 'treble-8vb';
};

// Bottom line reference: E4 for treble, E3 for treble-8vb (notated an octave up).
const staffReference = (clef: Clef): number => {
    const referenceOctave = clef === 'treble' ? 4 : 3;

    return referenceOctave * 7 + DIATONIC_INDEX.E;
};

export const staffPosition = (pitch: Pitch, clef: Clef): number => diatonicLadder(pitch) - staffReference(clef);

export const positionToPitch = (position: number, clef: Clef, alter: Pitch['alter']): Pitch => {
    const ladder = position + staffReference(clef);
    const octave = Math.floor(ladder / 7);
    const stepIndex = ((ladder % 7) + 7) % 7;

    return {
        step: STEP_BY_INDEX[stepIndex],
        alter,
        octave,
    };
};

export const ledgerPositions = (position: number): number[] => {
    const result: number[] = [];

    for (let ledger = -2; ledger >= position; ledger -= 2) {
        result.push(ledger);
    }

    for (let ledger = 10; ledger <= position; ledger += 2) {
        result.push(ledger);
    }

    return result;
};
