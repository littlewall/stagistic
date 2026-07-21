import {
    type DerivedMusic, formatMusicNumber, formatMusicOutLabel,
} from '@stagistic/script';

export interface MusicLabelMap {
    byMusicId: Map<string, string>,
    outByEndBlockId: Map<string, string>,
    outPartsByEndBlockId: Map<string, {
        musicId: string, number: string, title: string,
    }>,
}

/**
 * Music start → its formatted number. Explicit out → the closed music's label,
 * keyed by the out's block id (which equals the music's endBlockId). Hits and
 * implicitly-closed music contribute no out entry.
 */
export const buildMusicLabelMap = (music: DerivedMusic[]): MusicLabelMap => {
    const byMusicId = new Map<string, string>();
    const outByEndBlockId = new Map<string, string>();
    const outPartsByEndBlockId = new Map<string, {
        musicId: string, number: string, title: string,
    }>();

    music.forEach(music => {
        byMusicId.set(music.musicId, formatMusicNumber(music));

        if (music.mode === 'open' && music.endBlockId) {
            outByEndBlockId.set(music.endBlockId, formatMusicOutLabel(music));
            outPartsByEndBlockId.set(music.endBlockId, {
                musicId: music.musicId,
                number: formatMusicNumber(music),
                title: music.title.trim(),
            });
        }
    });

    return {
        byMusicId,
        outByEndBlockId,
        outPartsByEndBlockId,
    };
};
