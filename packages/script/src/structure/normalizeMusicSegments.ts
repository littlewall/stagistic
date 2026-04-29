import {createNodeId} from '@stagistic/shared';

import type {StructureBlockEntry} from './collectStructureBlocks';
import {
    getDefaultMusicSegmentName,
    isMusicSegmentEndSource,
    isMusicType,
    type MusicSegment,
    type MusicSegmentEnd,
    type MusicType,
} from './model';

type RawMusicSegment = {
    id: string,
    musicType: MusicType,
    name: string,
    startBlockId: string,
    explicitEnd: MusicSegmentEnd | null,
};

const toNonEmptyString = (value: unknown) => {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim();
};

const sanitizeMusicSegments = (value: unknown): RawMusicSegment[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map(item => {
            if (!item || typeof item !== 'object') {
                return null;
            }

            const record = item as Record<string, unknown>;

            if (record.kind && record.kind !== 'music') {
                return null;
            }

            const startBlockId = toNonEmptyString(record.startBlockId);

            if (!startBlockId) {
                return null;
            }

            const rawType = record.musicType;
            const musicType = isMusicType(rawType) ? rawType : 'song';
            const rawEnd = record.end;
            let explicitEnd: MusicSegmentEnd | null = null;

            if (rawEnd && typeof rawEnd === 'object') {
                const endRecord = rawEnd as Record<string, unknown>;
                const anchor = endRecord.anchor === 'eof' ? 'eof' : 'block';
                const source = isMusicSegmentEndSource(endRecord.source)
                    ? endRecord.source
                    : 'explicit';
                const blockId = toNonEmptyString(endRecord.blockId);

                if (anchor === 'eof') {
                    explicitEnd = {
                        anchor: 'eof',
                        source,
                    };
                }

                if (anchor !== 'eof' && blockId) {
                    explicitEnd = {
                        anchor: 'block',
                        blockId,
                        source,
                    };
                }
            }

            return {
                id: toNonEmptyString(record.id) || createNodeId(),
                musicType,
                name: toNonEmptyString(record.name) || getDefaultMusicSegmentName(musicType),
                startBlockId,
                explicitEnd,
            };
        })
        .filter((item): item is RawMusicSegment => Boolean(item));
};

export const normalizeMusicSegments = (
    value: unknown,
    blocks: StructureBlockEntry[],
): MusicSegment[] => {
    const rawSegments = sanitizeMusicSegments(value);

    if (rawSegments.length === 0 || blocks.length === 0) {
        return [];
    }

    const blockById = new Map(blocks.filter(block => block.id).map(block => [block.id, block]));
    const sceneEndBySceneIndex = new Map<number, StructureBlockEntry>();

    blocks.forEach(block => {
        sceneEndBySceneIndex.set(block.sceneIndex, block);
    });

    const seenStartAnchors = new Set<string>();
    const segments = rawSegments
        .filter(segment => blockById.has(segment.startBlockId))
        .filter(segment => {
            if (seenStartAnchors.has(segment.startBlockId)) {
                return false;
            }

            seenStartAnchors.add(segment.startBlockId);

            return true;
        })
        .sort((a, b) => {
            const aIndex = blockById.get(a.startBlockId)?.index ?? Number.MAX_SAFE_INTEGER;
            const bIndex = blockById.get(b.startBlockId)?.index ?? Number.MAX_SAFE_INTEGER;

            return aIndex - bIndex;
        });

    const lastBlockIndex = blocks[blocks.length - 1]?.index ?? -1;
    const lastSceneIndex = Array.from(sceneEndBySceneIndex.keys()).reduce(
        (max, value) => value > max ? value : max,
        -1,
    );

    return segments.map((segment, index) => {
        const startBlock = blockById.get(segment.startBlockId)!;
        const nextSegment = segments[index + 1];
        const nextStartBlock = nextSegment ? blockById.get(nextSegment.startBlockId) ?? null : null;
        const sceneEndBlock = sceneEndBySceneIndex.get(startBlock.sceneIndex) ?? null;
        const explicitEnd = segment.explicitEnd;
        let explicitEndBlock: StructureBlockEntry | null = null;

        if (explicitEnd?.anchor === 'block' && explicitEnd.blockId) {
            explicitEndBlock = blockById.get(explicitEnd.blockId) ?? null;
        }

        const maxAllowedIndex = Math.min(
            nextStartBlock?.index ?? Number.MAX_SAFE_INTEGER,
            sceneEndBlock?.index ?? Number.MAX_SAFE_INTEGER,
        );
        const explicitBlockIsValid = Boolean(
            explicitEndBlock
            && explicitEndBlock.sceneIndex === startBlock.sceneIndex
            && explicitEndBlock.index >= startBlock.index
            && explicitEndBlock.index <= maxAllowedIndex,
        );
        const explicitEofIsValid = Boolean(
            explicitEnd?.anchor === 'eof'
            && !nextStartBlock
            && startBlock.sceneIndex === lastSceneIndex,
        );

        if (explicitEnd?.anchor === 'block' && explicitBlockIsValid) {
            return {
                id: segment.id,
                kind: 'music',
                musicType: segment.musicType,
                name: segment.name || getDefaultMusicSegmentName(segment.musicType),
                startBlockId: segment.startBlockId,
                end: {
                    anchor: 'block',
                    blockId: explicitEndBlock!.id,
                    source: 'explicit',
                },
            } satisfies MusicSegment;
        }

        if (explicitEofIsValid) {
            return {
                id: segment.id,
                kind: 'music',
                musicType: segment.musicType,
                name: segment.name || getDefaultMusicSegmentName(segment.musicType),
                startBlockId: segment.startBlockId,
                end: {
                    anchor: 'eof',
                    source: 'explicit',
                },
            } satisfies MusicSegment;
        }

        if (
            nextStartBlock
            && nextStartBlock.sceneIndex === startBlock.sceneIndex
            && nextStartBlock.index > startBlock.index
        ) {
            return {
                id: segment.id,
                kind: 'music',
                musicType: segment.musicType,
                name: segment.name || getDefaultMusicSegmentName(segment.musicType),
                startBlockId: segment.startBlockId,
                end: {
                    anchor: 'block',
                    blockId: nextStartBlock.id,
                    source: 'auto-open-next',
                },
            } satisfies MusicSegment;
        }

        if (sceneEndBlock && sceneEndBlock.id && sceneEndBlock.index >= startBlock.index) {
            if (sceneEndBlock.index >= lastBlockIndex) {
                return {
                    id: segment.id,
                    kind: 'music',
                    musicType: segment.musicType,
                    name: segment.name || getDefaultMusicSegmentName(segment.musicType),
                    startBlockId: segment.startBlockId,
                    end: {
                        anchor: 'eof',
                        source: 'auto-eof',
                    },
                } satisfies MusicSegment;
            }

            return {
                id: segment.id,
                kind: 'music',
                musicType: segment.musicType,
                name: segment.name || getDefaultMusicSegmentName(segment.musicType),
                startBlockId: segment.startBlockId,
                end: {
                    anchor: 'block',
                    blockId: sceneEndBlock.id,
                    source: 'auto-scene-boundary',
                },
            } satisfies MusicSegment;
        }

        return {
            id: segment.id,
            kind: 'music',
            musicType: segment.musicType,
            name: segment.name || getDefaultMusicSegmentName(segment.musicType),
            startBlockId: segment.startBlockId,
            end: {
                anchor: 'eof',
                source: 'auto-eof',
            },
        } satisfies MusicSegment;
    });
};
