import type {
    DerivedMusic,
    DerivedMusicTimeline,
    MusicBlockInput,
    MusicEndKind,
} from './types';

const isSceneBoundary = (blockType: string) => blockType === 'act' || blockType === 'scene';

const setEffectiveEnd = (
    music: DerivedMusic,
    effectiveEndBlockId: string,
    endKind: MusicEndKind,
) => {
    music.effectiveEndBlockId = effectiveEndBlockId;
    music.endKind = endKind;
};

/**
 * Pairs music atoms into music (spec §3.1) and numbers them per scene. Musical
 * structural music do not overlap as intervals: at most one open music is in
 * progress; a new open start or a scene boundary implicitly closes the
 * previous open music; an out closes the open music or is dropped (orphan). A hit
 * is a zero-duration point (endBlockId = startBlockId) that does not touch the
 * open music. Each music start carries its scene ordinal and its position among
 * the starts in that scene.
 */
export const deriveMusicTimeline = (blocks: MusicBlockInput[]): DerivedMusicTimeline => {
    const music: DerivedMusic[] = [];
    const orphanOutBlockIds: string[] = [];
    const musicByScene = new Map<number, DerivedMusic[]>();
    let openMusic: DerivedMusic | null = null;
    let sceneNumber = 0;
    let previousBlockId: string | null = null;

    for (const block of blocks) {
        if (isSceneBoundary(block.blockType) && openMusic) {
            setEffectiveEnd(
                openMusic,
                previousBlockId ?? openMusic.startBlockId,
                'scene-end',
            );
            openMusic = null;
        }

        if (block.blockType === 'scene') {
            sceneNumber += 1;
        }

        for (const atom of block.musicAtoms) {
            if (atom.role === 'start') {
                const sceneMusic = musicByScene.get(sceneNumber) ?? [];
                const musicEntry: DerivedMusic = {
                    musicId: atom.musicId,
                    sceneNumber,
                    indexInScene: sceneMusic.length,
                    sceneMusicCount: 0,
                    mode: atom.mode,
                    title: atom.title,
                    kind: atom.kind,
                    startBlockId: block.blockId,
                    endBlockId: atom.mode === 'hit' ? block.blockId : null,
                    effectiveEndBlockId: block.blockId,
                    endKind: atom.mode === 'hit' ? 'hit' : 'document-end',
                };

                sceneMusic.push(musicEntry);
                musicByScene.set(sceneNumber, sceneMusic);
                music.push(musicEntry);

                if (atom.mode === 'open') {
                    if (openMusic) {
                        setEffectiveEnd(openMusic, block.blockId, 'next-music');
                    }

                    openMusic = musicEntry;
                }

                continue;
            }

            if (openMusic) {
                openMusic.endBlockId = block.blockId;
                setEffectiveEnd(openMusic, block.blockId, 'explicit');
                openMusic = null;

                continue;
            }

            orphanOutBlockIds.push(block.blockId);
        }

        previousBlockId = block.blockId;
    }

    if (openMusic) {
        setEffectiveEnd(
            openMusic,
            previousBlockId ?? openMusic.startBlockId,
            'document-end',
        );
    }

    musicByScene.forEach(sceneMusic => {
        sceneMusic.forEach(musicEntry => {
            musicEntry.sceneMusicCount = sceneMusic.length;
        });
    });

    return {music, orphanOutBlockIds};
};

export const deriveMusic = (blocks: MusicBlockInput[]): DerivedMusic[] => {
    return deriveMusicTimeline(blocks).music;
};
