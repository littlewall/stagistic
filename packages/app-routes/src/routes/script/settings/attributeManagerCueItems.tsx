import type {
    EditorLiveCueSnapshot,
    EditorLiveStructureSnapshot,
} from '@stagistic/editor';
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

export const buildAttributeManagerCueItemsFromLive = (
    documentCues: EditorLiveCueSnapshot,
    structure: EditorLiveStructureSnapshot,
    cues: readonly ScriptCueListItem[],
): AttributeManagerListItem[] => {
    const catalogCueById = new Map(cues.map(cue => [cue.id, cue] as const));
    const documentCueIds = new Set(documentCues.map(cue => cue.cueId));
    const structureRowById = new Map(structure.rows.map(row => [row.blockId, row] as const));
    const sceneRows = structure.rows.filter(row => row.kind === 'scene');
    const sceneNumberById = new Map(sceneRows.map((scene, index) => [scene.blockId, index + 1] as const));
    const assignedItems = documentCues.map(cue => {
        const catalogCue = catalogCueById.get(cue.cueId);
        const kind = catalogCue?.kind ?? (cue.kind === 'instrumental' ? 'instrumental' : 'song');
        const sceneId = structure.sceneByBlockId.get(cue.startBlockId);
        const actId = structure.actByBlockId.get(cue.startBlockId);
        const scene = sceneId ? structureRowById.get(sceneId) : null;
        const act = actId ? structureRowById.get(actId) : null;
        const sceneNumber = sceneId ? sceneNumberById.get(sceneId) : null;
        const sceneLabel = scene?.kind === 'scene'
            ? `${sceneNumber ?? '–'}. ${scene.title || 'Untitled scene'}`
            : '–';

        return {
            id: cue.cueId,
            number: formatCueNumber(cue),
            title: catalogCue?.title || cue.title || 'Untitled cue',
            icon: kind === 'instrumental' ? <MusicDoubleNoteIcon /> : <MicrophoneIcon />,
            detailMetadata: [{label: 'Act', value: act?.kind === 'act' ? act.name || '–' : '–'}, {label: 'Scene', value: sceneLabel}],
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
