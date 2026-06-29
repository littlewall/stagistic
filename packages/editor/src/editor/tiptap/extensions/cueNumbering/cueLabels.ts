import {
    type DerivedCue, formatCueNumber, formatOutLabel,
} from '@stagistic/script';

export interface CueLabelMap {
    byCueId: Map<string, string>,
    outByEndBlockId: Map<string, string>,
    outPartsByEndBlockId: Map<string, {number: string, title: string}>,
}

/**
 * Cue start → its formatted number. Explicit out → the closed cue's label,
 * keyed by the out's block id (which equals the cue's endBlockId). Hits and
 * implicitly-closed cues contribute no out entry.
 */
export const buildCueLabelMap = (cues: DerivedCue[]): CueLabelMap => {
    const byCueId = new Map<string, string>();
    const outByEndBlockId = new Map<string, string>();
    const outPartsByEndBlockId = new Map<string, {number: string, title: string}>();

    cues.forEach(cue => {
        byCueId.set(cue.cueId, formatCueNumber(cue));

        if (cue.mode === 'open' && cue.endBlockId) {
            outByEndBlockId.set(cue.endBlockId, formatOutLabel(cue));
            outPartsByEndBlockId.set(cue.endBlockId, {
                number: formatCueNumber(cue),
                title: cue.title.trim(),
            });
        }
    });

    return {
        byCueId,
        outByEndBlockId,
        outPartsByEndBlockId,
    };
};
