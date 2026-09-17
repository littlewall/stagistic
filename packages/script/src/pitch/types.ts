export interface Pitch {
    step: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B',
    alter: -1 | 0 | 1,
    octave: number,
}

export type Clef = 'treble' | 'treble-8vb';
