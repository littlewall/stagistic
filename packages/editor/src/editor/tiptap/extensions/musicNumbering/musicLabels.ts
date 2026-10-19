import {
    type DerivedMusic,
    formatMusicNumber,
} from '@stagistic/script';

export interface MusicLabelMap {
    byMusicId: Map<string, string>,
}

/**
 * Music starts receive their scene-scoped number. Outs are structural and are
 * deliberately rendered only by the canvas rail.
 */
export const buildMusicLabelMap = (music: DerivedMusic[]): MusicLabelMap => {
    const byMusicId = new Map<string, string>();

    music.forEach(item => {
        byMusicId.set(item.musicId, formatMusicNumber(item));
    });

    return {
        byMusicId,
    };
};
