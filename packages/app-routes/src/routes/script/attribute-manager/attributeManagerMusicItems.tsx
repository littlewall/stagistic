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

const formatMusicLocation = (actLabel: string | null, sceneLabel: string | null) => {
    const location = [actLabel, sceneLabel].filter(Boolean).join(' · ');

    return location || null;
};

const musicTitle = (catalogTitle: string | undefined, documentTitle: string) => catalogTitle || documentTitle || 'Untitled music';

interface MusicLocation {
    group: AttributeManagerListItem['group'],
    sceneLabel: string | null,
}

const buildMusicItems = (
    documentMusic: EditorLiveMusicSnapshot,
    music: readonly ScriptMusicListItem[],
    getLocation: (startBlockId: string) => MusicLocation,
): AttributeManagerListItem[] => {
    const catalogMusicById = new Map(music.map(item => [item.id, item] as const));
    const documentMusicIds = new Set(documentMusic.map(item => item.musicId));
    const assignedItems = documentMusic.map(item => {
        const catalogMusic = catalogMusicById.get(item.musicId);
        const kind = catalogMusic?.kind ?? (item.kind === 'instrumental' ? 'instrumental' : 'song');
        const {group, sceneLabel} = getLocation(item.startBlockId);
        const number = formatMusicNumber(item);

        return {
            id: item.musicId,
            number,
            title: musicTitle(catalogMusic?.title, item.title),
            group,
            icon: kind === 'instrumental' ? <MusicDoubleNoteIcon /> : <MicrophoneIcon />,
            detailTitlePrefix: number,
            detailSubtitle: formatMusicLocation(group?.label ?? null, sceneLabel),
        };
    });
    const unassignedItems = music
        .filter(item => !documentMusicIds.has(item.id))
        .map(item => ({
            id: item.id,
            number: '',
            title: item.title,
            group: {id: 'unassigned', label: 'Unassigned'},
            icon: item.kind === 'instrumental' ? <MusicDoubleNoteIcon /> : <MicrophoneIcon />,
            detailSubtitle: null,
        }));

    return [...assignedItems, ...unassignedItems];
};

export const buildAttributeManagerMusicItemsFromLive = (
    documentMusic: EditorLiveMusicSnapshot,
    structure: EditorLiveStructureSnapshot,
    music: readonly ScriptMusicListItem[],
): AttributeManagerListItem[] => {
    const structureRowById = new Map(structure.rows.map(row => [row.blockId, row] as const));
    const sceneRows = structure.rows.filter(row => row.kind === 'scene');
    const sceneNumberById = new Map(sceneRows.map((scene, index) => [scene.blockId, index + 1] as const));

    return buildMusicItems(documentMusic, music, startBlockId => {
        const sceneId = structure.sceneByBlockId.get(startBlockId);
        const actId = structure.actByBlockId.get(startBlockId);
        const scene = sceneId ? structureRowById.get(sceneId) : null;
        const act = actId ? structureRowById.get(actId) : null;
        const sceneNumber = sceneId ? sceneNumberById.get(sceneId) : null;

        return {
            group: act?.kind === 'act'
                ? {id: act.blockId, label: act.name || 'Untitled act'}
                : undefined,
            sceneLabel: scene?.kind === 'scene'
                ? `${sceneNumber ?? '–'}. ${scene.title || 'Untitled scene'}`
                : null,
        };
    });
};

export const buildAttributeManagerMusicItems = (
    document: ScriptDocument | null | undefined,
    music: readonly ScriptMusicListItem[],
): AttributeManagerListItem[] => {
    const snapshot = buildScriptBlockIndex(document).snapshot;
    const blockById = new Map(snapshot.blocks.map(block => [block.blockId, block] as const));
    const sceneNumberById = new Map(
        snapshot.blocks
            .filter(block => block.blockType === 'scene')
            .map((scene, index) => [scene.blockId, index + 1] as const),
    );

    return buildMusicItems(snapshot.music, music, startBlockId => {
        const startBlock = blockById.get(startBlockId);
        const act = startBlock?.actBlockId ? blockById.get(startBlock.actBlockId) : null;
        const scene = startBlock?.sceneBlockId ? blockById.get(startBlock.sceneBlockId) : null;
        const sceneNumber = scene ? sceneNumberById.get(scene.blockId) : null;

        return {
            group: act?.blockType === 'act'
                ? {id: act.blockId, label: act.textContent || 'Untitled act'}
                : undefined,
            sceneLabel: scene
                ? `${sceneNumber ?? '–'}. ${scene.textContent || 'Untitled scene'}`
                : null,
        };
    });
};
