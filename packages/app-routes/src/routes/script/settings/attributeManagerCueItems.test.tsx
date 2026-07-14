import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {ScriptCueListItem} from '../editor/cues';
import {buildAttributeManagerCueItems} from './attributeManagerCueItems';

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

describe('buildAttributeManagerCueItems', () => {
    it('adds the containing act and globally numbered scene to an assigned cue', () => {
        const document: ScriptDocument = {
            type: 'doc',
            content: [
                block('act', 'act-1', 'ACT I'),
                block('scene', 'scene-1', 'Dawn'),
                block('stageDirection', 'stage-1', 'Music starts', [
                    {
                        type: 'cueStart',
                        attrs: {
                            cueId: 'cue-1',
                            mode: 'open',
                            title: 'Old title',
                            kind: 'song',
                        },
                    },
                ]),
            ],
        };
        const cues: ScriptCueListItem[] = [
            {
                id: 'cue-1',
                title: 'Opening number',
                kind: 'instrumental',
                assignmentLabel: 'Assigned',
            },
        ];

        const [item] = buildAttributeManagerCueItems(document, cues);

        expect(item).toMatchObject({
            id: 'cue-1',
            title: 'Opening number',
            detailMetadata: [{label: 'Act', value: 'ACT I'}, {label: 'Scene', value: '1. Dawn'}],
        });
    });

    it('marks an unassigned cue as outside the script structure', () => {
        const cues: ScriptCueListItem[] = [
            {
                id: 'cue-1',
                title: 'Overture',
                kind: 'instrumental',
                assignmentLabel: null,
            },
        ];

        const [item] = buildAttributeManagerCueItems(null, cues);

        expect(item.detailMetadata).toEqual([{label: 'Act', value: '–'}, {label: 'Scene', value: '–'}]);
    });
});
