import type {CueBlockInput, DerivedCue} from './types';

/**
 * Pairs cue atoms into cues (spec §3.1). Musical structural cues do not
 * overlap as intervals: at most one open cue is in progress; a new open
 * start or a scene boundary implicitly closes the previous open cue; an
 * out closes the open cue or is dropped (orphan). A hit is a zero-duration
 * point (endBlockId = startBlockId) that does not touch the open cue.
 */
export const deriveCues = (blocks: CueBlockInput[]): DerivedCue[] => {
    const cues: DerivedCue[] = [];
    let openCue: DerivedCue | null = null;
    let cueNumber = 0;

    blocks.forEach(block => {
        if (block.blockType === 'scene') {
            openCue = null;
        }

        block.cueAtoms.forEach(atom => {
            if (atom.role === 'start') {
                cueNumber += 1;

                const cue: DerivedCue = {
                    cueId: atom.cueId,
                    number: cueNumber,
                    mode: atom.mode,
                    title: atom.title,
                    kind: atom.kind,
                    startBlockId: block.blockId,
                    endBlockId: atom.mode === 'hit' ? block.blockId : null,
                };

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

    return cues;
};
