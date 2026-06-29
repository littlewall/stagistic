import {getSchema} from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import {Node} from '@tiptap/pm/model';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    CueOutNode,
    CueStartNode,
    ScriptBlockNodes,
} from '../tiptap/nodes';
import {buildIndexSnapshotFromPmDoc} from './buildIndexSnapshotFromPmDoc';

const schema = getSchema([
    Document,
    Text,
    ...ScriptBlockNodes,
    CueStartNode,
    CueOutNode,
]);

describe('buildIndexSnapshotFromPmDoc cues', () => {
    it('projects cues from cue atom nodes in the document', () => {
        const doc = Node.fromJSON(schema, {
            type: 'doc',
            content: [
                {
                    type: 'stageDirection',
                    attrs: {id: 'b1'},
                    content: [
                        {
                            type: 'cueStart',
                            attrs: {
                                cueId: 'c1', mode: 'open', title: 'Night', kind: null,
                            },
                        },
                    ],
                }, {
                    type: 'stageDirection', attrs: {id: 'b2'}, content: [{type: 'cueOut'}],
                },
            ],
        });

        expect(buildIndexSnapshotFromPmDoc(doc).cues).toEqual([
            {
                cueId: 'c1', sceneNumber: 0, indexInScene: 0, sceneCueCount: 1, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: 'b2',
            },
        ]);
    });
});
