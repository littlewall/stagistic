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
    const snapshot = buildScriptBlockIndex(document).snapshot;
    const documentCues = snapshot.cues;
    const documentCueIds = new Set(documentCues.map(cue => cue.cueId));
    const blockById = new Map(snapshot.blocks.map(block => [block.blockId, block] as const));
    const sceneNumberById = new Map(
        snapshot.blocks
            .filter(block => block.blockType === 'scene')
            .map((scene, index) => [scene.blockId, index + 1] as const),
    );
    const assignedItems = documentCues.map(cue => {
        const catalogCue = catalogCueById.get(cue.cueId);
        const kind = catalogCue?.kind ?? (cue.kind === 'instrumental' ? 'instrumental' : 'song');
        const startBlock = blockById.get(cue.startBlockId);
        const act = startBlock?.actBlockId ? blockById.get(startBlock.actBlockId) : null;
        const scene = startBlock?.sceneBlockId ? blockById.get(startBlock.sceneBlockId) : null;
        const sceneNumber = scene ? sceneNumberById.get(scene.blockId) : null;
        const sceneLabel = scene
            ? `${sceneNumber ?? '–'}. ${scene.textContent || 'Untitled scene'}`
            : '–';

        return {
            id: cue.cueId,
            number: formatCueNumber(cue),
            title: catalogCue?.title || cue.title || 'Untitled cue',
            icon: kind === 'instrumental' ? <MusicDoubleNoteIcon /> : <MicrophoneIcon />,
            detailMetadata: [{label: 'Act', value: act?.textContent || '–'}, {label: 'Scene', value: sceneLabel}],
        };
    });
    const unassignedItems = cues
        .filter(cue => !documentCueIds.has(cue.id))
        .map(cue => ({
            id: cue.id,
            number: '–',
            title: cue.title,
            icon: cue.kind === 'instrumental' ? <MusicDoubleNoteIcon /> : <MicrophoneIcon />,
            detailMetadata: [{label: 'Act', value: '–'}, {label: 'Scene', value: '–'}],
        }));

    return [...assignedItems, ...unassignedItems];
};
