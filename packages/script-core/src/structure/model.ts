export const MUSIC_TYPES = [
    'song',
    'reprise',
    'underscore',
] as const;

export type MusicType = (typeof MUSIC_TYPES)[number];

export const MUSIC_SEGMENT_END_SOURCES = [
    'explicit',
    'auto-open-next',
    'auto-scene-boundary',
    'auto-eof',
] as const;

export type MusicSegmentEndSource = (typeof MUSIC_SEGMENT_END_SOURCES)[number];

export type MusicSegmentEnd = {
    anchor: 'block' | 'eof',
    blockId?: string,
    source: MusicSegmentEndSource,
};

export type MusicSegment = {
    id: string,
    kind: 'music',
    musicType: MusicType,
    name: string,
    startBlockId: string,
    end: MusicSegmentEnd,
};

export type ScriptStructure = {
    version: 1,
    musicSegments: MusicSegment[],
};

export const SCRIPT_STRUCTURE_VERSION = 1;

export const isMusicType = (value: unknown): value is MusicType => {
    return typeof value === 'string' && (MUSIC_TYPES as readonly string[]).includes(value);
};

export const isMusicSegmentEndSource = (value: unknown): value is MusicSegmentEndSource => {
    return typeof value === 'string' && (MUSIC_SEGMENT_END_SOURCES as readonly string[]).includes(value);
};

export const getDefaultMusicSegmentName = (musicType: MusicType) => {
    if (musicType === 'song') {
        return 'Untitled Song';
    }

    if (musicType === 'reprise') {
        return 'Untitled Reprise';
    }

    return 'Untitled Underscore';
};
