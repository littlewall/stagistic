import {
    type Clef,
    type Pitch,
    pitchToMidi,
    positionToPitch,
} from '@stagistic/script';

import type {VocalRangeNote} from './VocalRangeStaff.types';

const BOUND_LOW: Pitch = {
    step: 'C', alter: 0, octave: 2,
};
const BOUND_HIGH: Pitch = {
    step: 'C', alter: 0, octave: 6,
};

interface RangePitches {
    low: Pitch | null,
    high: Pitch | null,
}

export const isPitchAllowed = (
    which: VocalRangeNote,
    pitch: Pitch,
    {low, high}: RangePitches,
): boolean => {
    const midi = pitchToMidi(pitch);
    const withinBounds = midi >= pitchToMidi(BOUND_LOW) && midi <= pitchToMidi(BOUND_HIGH);

    if (!withinBounds) {
        return false;
    }

    const other = which === 'low' ? high : low;

    if (!other) {
        return true;
    }

    const otherMidi = pitchToMidi(other);

    return which === 'low' ? midi <= otherMidi : midi >= otherMidi;
};

interface ConstrainStaffPitchOptions extends RangePitches {
    which: VocalRangeNote,
    position: number,
    alter: Pitch['alter'],
    clef: Clef,
    minPosition: number,
    maxPosition: number,
    fallback: Pitch,
}

export const constrainStaffPitch = ({
    which,
    position,
    alter,
    clef,
    minPosition,
    maxPosition,
    fallback,
    low,
    high,
}: ConstrainStaffPitchOptions): Pitch => {
    const candidatePositions = Array.from(
        {length: maxPosition - minPosition + 1},
        (_, index) => minPosition + index,
    ).sort((left, right) => Math.abs(left - position) - Math.abs(right - position));

    for (const candidatePosition of candidatePositions) {
        const candidate = positionToPitch(candidatePosition, clef, alter);

        if (isPitchAllowed(which, candidate, {low, high})) {
            return candidate;
        }
    }

    return fallback;
};
