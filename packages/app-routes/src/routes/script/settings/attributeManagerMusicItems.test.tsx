import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {ScriptMusicListItem} from '../editor/music';
import {buildAttributeManagerMusicItems} from './attributeManagerMusicItems';

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
    it('adds the containing act and globally numbered scene to an assigned music', () => {
        const document: ScriptDocument = {
            type: 'doc',
            content: [
                block('act', 'act-1', 'ACT I'),
                block('scene', 'scene-1', 'Dawn'),
                block('stageDirection', 'stage-1', 'Music starts', [
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
            detailMetadata: [{label: 'Act', value: 'ACT I'}, {label: 'Scene', value: '1. Dawn'}],
        });
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

        expect(item.detailMetadata).toEqual([{label: 'Act', value: '–'}, {label: 'Scene', value: '–'}]);
    });
});
