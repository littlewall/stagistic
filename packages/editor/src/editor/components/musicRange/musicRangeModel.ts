import type {
    DerivedMusic,
    ScriptBlockIndexSnapshot,
} from '@stagistic/script';

export type MusicRailMarkerKind = 'none' | 'start' | 'hit' | 'end' | 'shared' | 'orphan';
export type MusicRailEndTone = 'explicit' | 'implicit' | 'orphan';

export interface MusicRailBoundarySite {
    blockId: string,
    pos: number,
    hasMusicStart: boolean,
    hasMusicOut: boolean,
}

export interface MusicRailBoundary {
    blockId: string,
    pos: number,
    markerKind: MusicRailMarkerKind,
    endTone: MusicRailEndTone | null,
    startMode: DerivedMusic['mode'] | null,
    startMusicId: string | null,
    endMusicId: string | null,
    hasActions: boolean,
}

const resolveMarkerKind = (
    start: DerivedMusic | null,
    endTone: MusicRailEndTone | null,
): MusicRailMarkerKind => {
    if (start && endTone) {
        return 'shared';
    }

    if (endTone === 'orphan') {
        return 'orphan';
    }

    if (endTone) {
        return 'end';
    }

    if (start?.mode === 'hit') {
        return 'hit';
    }

    return start ? 'start' : 'none';
};

export const buildMusicRailBoundaries = (
    snapshot: ScriptBlockIndexSnapshot,
    sites: readonly MusicRailBoundarySite[],
): MusicRailBoundary[] => {
    const blocksById = new Map(snapshot.blocks.map(block => [block.blockId, block] as const));
    const startsByBlockId = new Map(snapshot.music.map(music => [music.startBlockId, music] as const));
    const endingsByBlockId = new Map<string, DerivedMusic[]>();
    const latestOpenByScene = new Map<string | null, DerivedMusic>();
    const orphanBlockIds = new Set(snapshot.orphanMusicOutBlockIds);

    snapshot.music.forEach(music => {
        if (music.mode !== 'open') {
            return;
        }

        const endings = endingsByBlockId.get(music.effectiveEndBlockId) ?? [];

        endings.push(music);
        endingsByBlockId.set(music.effectiveEndBlockId, endings);
    });

    return [...sites]
        .sort((left, right) => {
            return (blocksById.get(left.blockId)?.orderNo ?? 0)
                - (blocksById.get(right.blockId)?.orderNo ?? 0);
        })
        .map(site => {
            const block = blocksById.get(site.blockId);
            const sceneBlockId = block?.sceneBlockId ?? null;
            const candidate = latestOpenByScene.get(sceneBlockId) ?? null;
            const start = startsByBlockId.get(site.blockId) ?? null;
            const endings = endingsByBlockId.get(site.blockId) ?? [];
            const end = endings.find(music => music.musicId !== start?.musicId)
                ?? endings[0]
                ?? null;
            const isOrphan = site.hasMusicOut && orphanBlockIds.has(site.blockId);
            const endTone: MusicRailEndTone | null = isOrphan
                ? 'orphan'
                : end?.endKind === 'explicit'
                    ? 'explicit'
                    : end
                        ? 'implicit'
                        : null;
            const canAddMusic = block?.blockType === 'stageDirection' && !site.hasMusicStart;

            if (start?.mode === 'open') {
                latestOpenByScene.set(sceneBlockId, start);
            }

            return {
                blockId: site.blockId,
                pos: site.pos,
                markerKind: resolveMarkerKind(start, endTone),
                endTone,
                startMode: start?.mode ?? null,
                startMusicId: start?.musicId ?? null,
                endMusicId: end?.musicId ?? null,
                hasActions: canAddMusic || site.hasMusicOut || candidate !== null,
            };
        });
};

export const canDropMusicOutAtBoundary = (
    snapshot: ScriptBlockIndexSnapshot,
    musicId: string | null,
    targetBlockId: string,
) => {
    const blocksById = new Map(snapshot.blocks.map(block => [block.blockId, block] as const));
    const target = blocksById.get(targetBlockId);

    if (!target) {
        return false;
    }

    if (target.blockType === 'act' || target.blockType === 'scene') {
        return false;
    }

    if (!musicId) {
        return snapshot.music.some(music => {
            const start = blocksById.get(music.startBlockId);

            return music.mode === 'open'
                && start !== undefined
                && start.sceneBlockId === target.sceneBlockId
                && start.orderNo < target.orderNo;
        });
    }

    const music = snapshot.music.find(candidate => candidate.musicId === musicId);
    const start = music ? blocksById.get(music.startBlockId) : null;

    if (!music || music.mode !== 'open' || !start
        || start.sceneBlockId !== target.sceneBlockId
        || target.orderNo <= start.orderNo) {
        return false;
    }

    const nextStartOrder = snapshot.music
        .filter(candidate => candidate.mode === 'open' && candidate.musicId !== music.musicId)
        .map(candidate => blocksById.get(candidate.startBlockId))
        .filter(candidate => {
            return candidate !== undefined
                && candidate.sceneBlockId === start.sceneBlockId
                && candidate.orderNo > start.orderNo;
        })
        .reduce<number | null>((closest, candidate) => {
            if (!candidate) {
                return closest;
            }

            return closest === null ? candidate.orderNo : Math.min(closest, candidate.orderNo);
        }, null);

    return nextStartOrder === null || target.orderNo <= nextStartOrder;
};
