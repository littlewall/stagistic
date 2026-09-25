import {joinBackward} from '@tiptap/pm/commands';
import {Schema} from '@tiptap/pm/model';
import {EditorState, TextSelection} from '@tiptap/pm/state';
import {describe, expect, it} from 'vite-plus/test';

import {detectMergedBlocks} from './detectMergedBlocks';

const block = {group: 'block', content: 'inline*', attrs: {id: {default: null}}, toDOM: () => ['p', 0] as const};
const schema = new Schema({nodes: {doc: {content: 'block+'}, text: {group: 'inline'}, dialogue: block}});
const make = () =>
    schema.node('doc', null, [
        schema.node('dialogue', {id: 'b1'}, [schema.text('One')]),
        schema.node('dialogue', {id: 'b2'}, [schema.text('Two')]),
        schema.node('dialogue', {id: 'b3'}, [schema.text('Three')]),
    ]);

describe('detectMergedBlocks', () => {
    it('reports a block joined into its predecessor', () => {
        const doc = make();
        const state = EditorState.create({doc, selection: TextSelection.create(doc, 6)});
        let merged: ReturnType<typeof detectMergedBlocks> = [];

        joinBackward(state, tr => {
            merged = detectMergedBlocks(state.doc, tr.doc, tr.mapping);
        });

        expect(merged).toEqual([{fromBlockId: 'b2', toBlockId: 'b1'}]);
    });

    it('reports nothing when a whole block is deleted', () => {
        const doc = make();
        const state = EditorState.create({doc});
        const b2Start = doc.child(0).nodeSize;
        const tr = state.tr.delete(b2Start, b2Start + doc.child(1).nodeSize);

        expect(detectMergedBlocks(state.doc, tr.doc, tr.mapping)).toEqual([]);
    });

    it('reports only the block whose tail survives a cross-block deletion', () => {
        const doc = make();
        const state = EditorState.create({doc});
        const tr = state.tr.delete(3, doc.content.size - 3);

        expect(detectMergedBlocks(state.doc, tr.doc, tr.mapping)).toEqual([{fromBlockId: 'b3', toBlockId: 'b1'}]);
    });
});
