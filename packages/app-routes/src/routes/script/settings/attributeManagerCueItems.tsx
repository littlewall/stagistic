import {
    buildScriptBlockIndex,
    formatCueNumber,
    type ScriptDocument,
} from '@stagistic/script';
import {
    type AttributeManagerListItem,
    MicrophoneIcon,
    MusicDoubleNoteIcon,
} from '@stagistic/ui';

import type {ScriptCueListItem} from '../editor/cues';

export const buildAttributeManagerCueItems = (
    document: ScriptDocument | null | undefined,
    cues: readonly ScriptCueListItem[],
): AttributeManagerListItem[] => {
    const catalogCueById = new Map(cues.map(cue => [cue.id, cue] as const));
    const documentCues = buildScriptBlockIndex(document).snapshot.cues;
    const documentCueIds = new Set(documentCues.map(cue => cue.cueId));
    const assignedItems = documentCues.map(cue => {
        const catalogCue = catalogCueById.get(cue.cueId);
        const kind = cue.kind === 'instrumental' || catalogCue?.kind === 'instrumental'
            ? 'instrumental'
            : 'song';

        return {
            id: cue.cueId,
            number: formatCueNumber(cue),
            title: cue.title || catalogCue?.title || 'Untitled cue',
            icon: kind === 'instrumental' ? <MusicDoubleNoteIcon /> : <MicrophoneIcon />,
        };
    });
    const unassignedItems = cues
        .filter(cue => !documentCueIds.has(cue.id))
        .map(cue => ({
            id: cue.id,
            number: '–',
            title: cue.title,
            icon: cue.kind === 'instrumental' ? <MusicDoubleNoteIcon /> : <MicrophoneIcon />,
        }));

    return [...assignedItems, ...unassignedItems];
};
