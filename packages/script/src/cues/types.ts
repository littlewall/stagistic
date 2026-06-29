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
    /** 1-based scene ordinal (global across acts); 0 before the first scene. */
    sceneNumber: number,
    /** 0-based position among cue starts within the scene. */
    indexInScene: number,
    /** Total cue starts in the scene. */
    sceneCueCount: number,
    mode: CueMode,
    title: string,
    kind: string | null,
    startBlockId: string,
    endBlockId: string | null,
}
