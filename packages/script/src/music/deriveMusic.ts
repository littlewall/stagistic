import type {DerivedMusic, MusicBlockInput} from './types';

/**
 * Pairs music atoms into music (spec §3.1) and numbers them per scene. Musical
 * structural music do not overlap as intervals: at most one open music is in
 * progress; a new open start or a scene boundary implicitly closes the
 * previous open music; an out closes the open music or is dropped (orphan). A hit
 * is a zero-duration point (endBlockId = startBlockId) that does not touch the
 * open music. Each music start carries its scene ordinal and its position among
 * the starts in that scene.
 */
export const deriveMusic = (blocks: MusicBlockInput[]): DerivedMusic[] => {
    const music: DerivedMusic[] = [];
    const musicByScene = new Map<number, DerivedMusic[]>();
    let openMusic: DerivedMusic | null = null;
    let sceneNumber = 0;

    blocks.forEach(block => {
        if (block.blockType === 'scene') {
            sceneNumber += 1;
            openMusic = null;
        }

        block.musicAtoms.forEach(atom => {
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
                };

                sceneMusic.push(musicEntry);
                musicByScene.set(sceneNumber, sceneMusic);
                music.push(musicEntry);

                if (atom.mode === 'open') {
                    openMusic = musicEntry;
                }

                return;
            }

            if (openMusic) {
                openMusic.endBlockId = block.blockId;
                openMusic = null;
            }
        });
    });

    musicByScene.forEach(sceneMusic => {
        sceneMusic.forEach(musicEntry => {
            musicEntry.sceneMusicCount = sceneMusic.length;
        });
    });

    return music;
};
