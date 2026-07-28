import type {
    EditorLiveMusicSnapshot,
    EditorLiveStructureSnapshot,
} from '@stagistic/editor';
import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {ScriptMusicListItem} from '../editor/music';
import {
    buildAttributeManagerMusicItems,
    buildAttributeManagerMusicItemsFromLive,
} from './attributeManagerMusicItems';

const block = (
    type: string,
    id: string,
    text: string,
    content: ScriptNode[] = [],
): ScriptNode => ({
    type,
    attrs: {id},
    content: text ? [{type: 'text', text}, ...content] : content,
});

describe('buildAttributeManagerMusicItems', () => {
    it('keeps act grouping and scene subtitles in the live editor path', () => {
        const documentMusic: EditorLiveMusicSnapshot = [
            {
                musicId: 'music-1',
                sceneNumber: 2,
                indexInScene: 0,
                sceneMusicCount: 1,
                mode: 'open',
                title: 'Old title',
                kind: 'song',
                startBlockId: 'stage-2',
                endBlockId: null,
                effectiveEndBlockId: 'stage-2',
                endKind: 'document-end',
            },
        ];
        const structure: EditorLiveStructureSnapshot = {
            rows: [
                {
                    kind: 'act', blockId: 'act-1', name: 'ACT I', index: 0,
                },
                {
                    kind: 'scene', blockId: 'scene-1', title: 'Dawn', index: 1,
                },
                {
                    kind: 'act', blockId: 'act-2', name: 'ACT II', index: 2,
                },
                {
                    kind: 'scene', blockId: 'scene-2', title: 'Night', index: 3,
                },
            ],
            rowIndexByBlockId: new Map(),
            sceneByBlockId: new Map([['stage-2', 'scene-2']]),
            actByBlockId: new Map([['stage-2', 'act-2']]),
        };
        const music: ScriptMusicListItem[] = [
            {
                id: 'music-1',
                title: 'Opening number',
                kind: 'instrumental',
                assignmentLabel: 'Assigned',
            },
        ];

        const [item] = buildAttributeManagerMusicItemsFromLive(documentMusic, structure, music);

        expect(item).toMatchObject({
            group: {id: 'act-2', label: 'ACT II'},
            detailSubtitle: '2. Night',
        });
    });

    it('groups assigned music under its containing act and exposes its scene subtitle', () => {
        const document: ScriptDocument = {
            type: 'doc',
            content: [
                block('act', 'act-1', 'ACT I'),
                block('scene', 'scene-1', 'Dawn'),
                block('stageDirection', 'stage-1', 'Silence'),
                block('act', 'act-2', 'ACT II'),
                block('scene', 'scene-2', 'Night'),
                block('stageDirection', 'stage-2', 'Music starts', [
                    {
                        type: 'musicStart',
                        attrs: {
                            musicId: 'music-1',
                            mode: 'open',
                            title: 'Old title',
                            kind: 'song',
                        },
                    },
                ]),
            ],
        };
        const music: ScriptMusicListItem[] = [
            {
                id: 'music-1',
                title: 'Opening number',
                kind: 'instrumental',
                assignmentLabel: 'Assigned',
            },
        ];

        const [item] = buildAttributeManagerMusicItems(document, music);

        expect(item).toMatchObject({
            id: 'music-1',
            title: 'Opening number',
            group: {id: 'act-2', label: 'ACT II'},
            detailSubtitle: '2. Night',
        });
        expect(item?.detailMetadata).toBeUndefined();
    });

    it('marks an unassigned music as outside the script structure', () => {
        const music: ScriptMusicListItem[] = [
            {
                id: 'music-1',
                title: 'Overture',
                kind: 'instrumental',
                assignmentLabel: null,
            },
        ];

        const [item] = buildAttributeManagerMusicItems(null, music);

        expect(item.number).toBe('');
        expect(item.group).toEqual({id: 'unassigned', label: 'Unassigned'});
        expect(item.detailSubtitle).toBeNull();
        expect(item.detailMetadata).toBeUndefined();
    });
});
