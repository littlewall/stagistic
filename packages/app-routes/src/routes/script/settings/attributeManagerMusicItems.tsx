import type {
    EditorLiveMusicSnapshot,
    EditorLiveStructureSnapshot,
} from '@stagistic/editor';
import {
    buildScriptBlockIndex,
    formatMusicNumber,
    type ScriptDocument,
} from '@stagistic/script';
import {
    type AttributeManagerListItem,
    MicrophoneIcon,
    MusicDoubleNoteIcon,
} from '@stagistic/ui';

import type {ScriptMusicListItem} from '../editor/music';

export const buildAttributeManagerMusicItemsFromLive = (
    documentMusic: EditorLiveMusicSnapshot,
    structure: EditorLiveStructureSnapshot,
    music: readonly ScriptMusicListItem[],
): AttributeManagerListItem[] => {
    const catalogMusicById = new Map(music.map(music => [music.id, music] as const));
    const documentMusicIds = new Set(documentMusic.map(music => music.musicId));
    const structureRowById = new Map(structure.rows.map(row => [row.blockId, row] as const));
    const sceneRows = structure.rows.filter(row => row.kind === 'scene');
    const sceneNumberById = new Map(sceneRows.map((scene, index) => [scene.blockId, index + 1] as const));
    const assignedItems = documentMusic.map(music => {
        const catalogMusic = catalogMusicById.get(music.musicId);
        const kind = catalogMusic?.kind ?? (music.kind === 'instrumental' ? 'instrumental' : 'song');
        const sceneId = structure.sceneByBlockId.get(music.startBlockId);
        const actId = structure.actByBlockId.get(music.startBlockId);
        const scene = sceneId ? structureRowById.get(sceneId) : null;
        const act = actId ? structureRowById.get(actId) : null;
        const sceneNumber = sceneId ? sceneNumberById.get(sceneId) : null;
        const sceneLabel = scene?.kind === 'scene'
            ? `${sceneNumber ?? '–'}. ${scene.title || 'Untitled scene'}`
            : null;

        return {
            id: music.musicId,
            number: formatMusicNumber(music),
            title: catalogMusic?.title || music.title || 'Untitled music',
            group: act?.kind === 'act'
                ? {id: act.blockId, label: act.name || 'Untitled act'}
                : undefined,
            icon: kind === 'instrumental' ? <MusicDoubleNoteIcon /> : <MicrophoneIcon />,
            detailSubtitle: sceneLabel,
        };
    });
    const unassignedItems = music
        .filter(music => !documentMusicIds.has(music.id))
        .map(music => ({
            id: music.id,
            number: '',
            title: music.title,
            group: {id: 'unassigned', label: 'Unassigned'},
            icon: music.kind === 'instrumental' ? <MusicDoubleNoteIcon /> : <MicrophoneIcon />,
            detailSubtitle: null,
        }));

    return [...assignedItems, ...unassignedItems];
};

export const buildAttributeManagerMusicItems = (
    document: ScriptDocument | null | undefined,
    music: readonly ScriptMusicListItem[],
): AttributeManagerListItem[] => {
    const catalogMusicById = new Map(music.map(music => [music.id, music] as const));
    const snapshot = buildScriptBlockIndex(document).snapshot;
    const documentMusic = snapshot.music;
    const documentMusicIds = new Set(documentMusic.map(music => music.musicId));
    const blockById = new Map(snapshot.blocks.map(block => [block.blockId, block] as const));
    const sceneNumberById = new Map(
        snapshot.blocks
            .filter(block => block.blockType === 'scene')
            .map((scene, index) => [scene.blockId, index + 1] as const),
    );
    const assignedItems = documentMusic.map(music => {
        const catalogMusic = catalogMusicById.get(music.musicId);
        const kind = catalogMusic?.kind ?? (music.kind === 'instrumental' ? 'instrumental' : 'song');
        const startBlock = blockById.get(music.startBlockId);
        const act = startBlock?.actBlockId ? blockById.get(startBlock.actBlockId) : null;
        const scene = startBlock?.sceneBlockId ? blockById.get(startBlock.sceneBlockId) : null;
        const sceneNumber = scene ? sceneNumberById.get(scene.blockId) : null;
        const sceneLabel = scene
            ? `${sceneNumber ?? '–'}. ${scene.textContent || 'Untitled scene'}`
            : null;

        return {
            id: music.musicId,
            number: formatMusicNumber(music),
            title: catalogMusic?.title || music.title || 'Untitled music',
            group: act?.blockType === 'act'
                ? {id: act.blockId, label: act.textContent || 'Untitled act'}
                : undefined,
            icon: kind === 'instrumental' ? <MusicDoubleNoteIcon /> : <MicrophoneIcon />,
            detailSubtitle: sceneLabel,
        };
    });
    const unassignedItems = music
        .filter(music => !documentMusicIds.has(music.id))
        .map(music => ({
            id: music.id,
            number: '',
            title: music.title,
            group: {id: 'unassigned', label: 'Unassigned'},
            icon: music.kind === 'instrumental' ? <MusicDoubleNoteIcon /> : <MicrophoneIcon />,
            detailSubtitle: null,
        }));

    return [...assignedItems, ...unassignedItems];
};
