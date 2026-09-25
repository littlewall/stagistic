import {Schema} from '@tiptap/pm/model';
import {describe, expect, it} from 'vite-plus/test';

import {buildCommentAnchorIndex} from './buildCommentAnchorIndex';

const block = {group: 'block', content: 'inline*', attrs: {id: {default: null}, blockType: {default: 'dialogue'}}, toDOM: () => ['p', 0] as const};
const schema = new Schema({
    nodes: {
        doc: {content: 'block+'},
        text: {group: 'inline'},
        dialogue: block,
        scene: {...block, attrs: {id: {default: null}, blockType: {default: 'scene'}}},
    },
    marks: {commentAnchor: {attrs: {threadId: {default: ''}}, inclusive: false, excludes: ''}},
});
const anchor = (threadId: string) => schema.marks.commentAnchor.create({threadId});
const doc = schema.node('doc', null, [
    schema.node('scene', {id: 's1'}, [schema.text('INT. ROOM')]),
    schema.node('dialogue', {id: 'b1'}, [schema.text('Hello '), schema.text('world', [anchor('t1')])]),
    schema.node('dialogue', {id: 'b2'}, [schema.text('Bye', [anchor('t1'), anchor('t2')])]),
]);

describe('buildCommentAnchorIndex', () => {
    it('spans a range anchor across blocks and records its first block and scene', () => {
        const index = buildCommentAnchorIndex(doc, new Map());
        const t1 = index.get('t1');

        expect(t1).toMatchObject({kind: 'range', blockId: 'b1', blockIndex: 1, sceneBlockId: 's1', sceneTitle: 'INT. ROOM'});
        expect(doc.textBetween(t1!.from, t1!.to, '|')).toBe('world|Bye');
        expect(index.get('t2')).toMatchObject({blockId: 'b2', blockIndex: 2});
    });

    it('locates block anchors by block id and skips missing blocks', () => {
        const threads = new Map([
            ['t3', {id: 't3', status: 'open' as const, anchorKind: 'block' as const, anchorBlockId: 'b2'}],
            ['t4', {id: 't4', status: 'open' as const, anchorKind: 'block' as const, anchorBlockId: 'gone'}],
        ]);
        const index = buildCommentAnchorIndex(doc, threads);

        expect(index.get('t3')).toMatchObject({kind: 'block', blockId: 'b2', blockIndex: 2});
        expect(doc.textBetween(index.get('t3')!.from, index.get('t3')!.to)).toBe('Bye');
        expect(index.has('t4')).toBe(false);
    });

    it('keeps a block anchor on the first block when an id is duplicated', () => {
        const duplicated = schema.node('doc', null, [
            schema.node('dialogue', {id: 'b1'}, [schema.text('First')]),
            schema.node('dialogue', {id: 'b1'}, [schema.text('Second')]),
        ]);
        const index = buildCommentAnchorIndex(
            duplicated,
            new Map([['t5', {id: 't5', status: 'open' as const, anchorKind: 'block' as const, anchorBlockId: 'b1'}]]),
        );

        expect(index.get('t5')).toMatchObject({blockIndex: 0});
    });
});
