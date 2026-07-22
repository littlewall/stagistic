import {getSchema} from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import {Node} from '@tiptap/pm/model';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    MusicOutNode,
    MusicStartNode,
    ScriptBlockNodes,
} from '../tiptap/nodes';
import {buildIndexSnapshotFromPmDoc} from './buildIndexSnapshotFromPmDoc';

const schema = getSchema([
    Document,
    Text,
    ...ScriptBlockNodes,
    MusicStartNode,
    MusicOutNode,
]);

describe('buildIndexSnapshotFromPmDoc music', () => {
    it('projects music from music atom nodes in the document', () => {
        const doc = Node.fromJSON(schema, {
            type: 'doc',
            content: [
                {
                    type: 'stageDirection',
                    attrs: {id: 'b1'},
                    content: [
                        {
                            type: 'musicStart',
                            attrs: {
                                musicId: 'c1', mode: 'open', title: 'Night', kind: null,
                            },
                        },
                    ],
                }, {
                    type: 'stageDirection', attrs: {id: 'b2'}, content: [{type: 'musicOut'}],
                },
            ],
        });

        expect(buildIndexSnapshotFromPmDoc(doc).music).toEqual([
            {
                musicId: 'c1', sceneNumber: 0, indexInScene: 0, sceneMusicCount: 1, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: 'b2', effectiveEndBlockId: 'b2', endKind: 'explicit',
            },
        ]);
    });
});
