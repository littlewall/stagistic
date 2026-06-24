import type {CUE_MODES} from './constants';

export type CueMode = (typeof CUE_MODES)[number];

export type CueAtom =
    | {
        role: 'start', cueId: string, mode: CueMode, title: string, kind: string | null,
    }
    | {role: 'out'};

export interface CueBlockInput {
    blockId: string,
    blockType: string,
    cueAtoms: CueAtom[],
}

export interface DerivedCue {
    cueId: string,
    number: number,
    mode: CueMode,
    title: string,
    kind: string | null,
    startBlockId: string,
    endBlockId: string | null,
}
