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

export type MusicEndKind =
    | 'hit'
    | 'explicit'
    | 'next-music'
    | 'scene-end'
    | 'document-end';

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
    /** Block that owns an explicit out marker. Implicit boundaries are not persisted. */
    endBlockId: string | null,
    /** Block whose trailing boundary is the effective end of the music. */
    effectiveEndBlockId: string,
    endKind: MusicEndKind,
}

export interface DerivedMusicTimeline {
    music: DerivedMusic[],
    orphanOutBlockIds: string[],
}
