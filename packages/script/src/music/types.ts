import type {MUSIC_MODES} from './constants';

export type MusicMode = (typeof MUSIC_MODES)[number];

export type MusicAtom =
    | {
        role: 'start', musicId: string, mode: MusicMode, title: string, kind: string | null,
    }
    | {role: 'out'};

export interface MusicBlockInput {
    blockId: string,
    blockType: string,
    musicAtoms: MusicAtom[],
}

export interface DerivedMusic {
    musicId: string,
    /** 1-based scene ordinal (global across acts); 0 before the first scene. */
    sceneNumber: number,
    /** 0-based position among music starts within the scene. */
    indexInScene: number,
    /** Total music starts in the scene. */
    sceneMusicCount: number,
    mode: MusicMode,
    title: string,
    kind: string | null,
    startBlockId: string,
    endBlockId: string | null,
}
