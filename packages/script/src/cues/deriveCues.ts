import type {CueBlockInput, DerivedCue} from './types';

/**
 * Pairs cue atoms into cues (spec §3.1) and numbers them per scene. Musical
 * structural cues do not overlap as intervals: at most one open cue is in
 * progress; a new open start or a scene boundary implicitly closes the
 * previous open cue; an out closes the open cue or is dropped (orphan). A hit
 * is a zero-duration point (endBlockId = startBlockId) that does not touch the
 * open cue. Each cue start carries its scene ordinal and its position among
 * the starts in that scene.
 */
export const deriveCues = (blocks: CueBlockInput[]): DerivedCue[] => {
    const cues: DerivedCue[] = [];
    const cuesByScene = new Map<number, DerivedCue[]>();
    let openCue: DerivedCue | null = null;
    let sceneNumber = 0;

    blocks.forEach(block => {
        if (block.blockType === 'scene') {
            sceneNumber += 1;
            openCue = null;
        }

        block.cueAtoms.forEach(atom => {
            if (atom.role === 'start') {
                const sceneCues = cuesByScene.get(sceneNumber) ?? [];
                const cue: DerivedCue = {
                    cueId: atom.cueId,
                    sceneNumber,
                    indexInScene: sceneCues.length,
                    sceneCueCount: 0,
                    mode: atom.mode,
                    title: atom.title,
                    kind: atom.kind,
                    startBlockId: block.blockId,
                    endBlockId: atom.mode === 'hit' ? block.blockId : null,
                };

                sceneCues.push(cue);
                cuesByScene.set(sceneNumber, sceneCues);
                cues.push(cue);

                if (atom.mode === 'open') {
                    openCue = cue;
                }

                return;
            }

            if (openCue) {
                openCue.endBlockId = block.blockId;
                openCue = null;
            }
        });
    });

    cuesByScene.forEach(sceneCues => {
        sceneCues.forEach(cue => {
            cue.sceneCueCount = sceneCues.length;
        });
    });

    return cues;
};
