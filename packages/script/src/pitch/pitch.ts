import type {Pitch} from './types';

const SEMITONE_BY_STEP: Record<Pitch['step'], number> = {
    C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};
const PITCH_PATTERN = /^([A-G])([#b]?)(-?\d+)$/u;

export const parsePitch = (spn: string): Pitch | null => {
    const match = PITCH_PATTERN.exec(spn.trim());

    if (!match) {
        return null;
    }

    const [
        , step,
        accidental,
        octave,
    ] = match;
    const alter = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;

    return {
        step: step as Pitch['step'],
        alter,
        octave: Number.parseInt(octave, 10),
    };
};

export const formatPitch = (pitch: Pitch): string => {
    const accidental = pitch.alter === 1 ? '#' : pitch.alter === -1 ? 'b' : '';

    return `${pitch.step}${accidental}${pitch.octave}`;
};

export const pitchToMidi = (pitch: Pitch): number => (pitch.octave + 1) * 12
    + SEMITONE_BY_STEP[pitch.step]
    + pitch.alter;
