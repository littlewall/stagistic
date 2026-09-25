import {describe, expect, it} from 'vite-plus/test';

import type {ScriptDocument} from '../document';
import {SCRIPT_DOCUMENT_SCHEMA_VERSION} from '../document';
import {COMMENT_ANCHOR_MARK_NAME, collectCommentAnchorThreadIds} from './commentAnchors';

const doc: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'dialogue',
            attrs: {id: 'b1'},
            content: [
                {type: 'text', text: 'Hello ', marks: [{type: COMMENT_ANCHOR_MARK_NAME, attrs: {threadId: 't1'}}]},
                {type: 'text', text: 'there', marks: [{type: 'bold'}, {type: COMMENT_ANCHOR_MARK_NAME, attrs: {threadId: 't2'}}]},
            ],
        },
        {
            type: 'stageDirection',
            attrs: {id: 'b2'},
            content: [{type: 'text', text: 'Exit', marks: [{type: COMMENT_ANCHOR_MARK_NAME, attrs: {threadId: 't1'}}]}],
        },
        {type: 'stageDirection', attrs: {id: 'b3'}, content: [{type: 'text', text: 'x', marks: [{type: COMMENT_ANCHOR_MARK_NAME, attrs: {threadId: ''}}]}]},
    ],
};

describe('collectCommentAnchorThreadIds', () => {
    it('collects unique thread ids across blocks and ignores empty ids and other marks', () => {
        expect([...collectCommentAnchorThreadIds(doc)].sort()).toEqual(['t1', 't2']);
    });

    it('returns an empty set for a document without anchors', () => {
        expect(collectCommentAnchorThreadIds({type: 'doc', content: []}).size).toBe(0);
    });
});

describe('document schema version', () => {
    it('is 4 after adding the commentAnchor mark', () => {
        expect(SCRIPT_DOCUMENT_SCHEMA_VERSION).toBe(4);
    });
});
