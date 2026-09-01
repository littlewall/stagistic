import {Schema} from '@tiptap/pm/model';
import {
    EditorState,
    TextSelection,
} from '@tiptap/pm/state';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {restoreSelectionForBlock} from './selectionHelpers';

const schema = new Schema({
    nodes: {
        doc: {content: 'stageDirection+'},
        text: {group: 'inline'},
        stageDirection: {
            group: 'block',
            content: 'text*',
            attrs: {id: {default: ''}},
        },
    },
    marks: {},
});

const createEditor = () => {
    const firstBlock = schema.node('stageDirection', {id: 'first'}, [schema.text('First')]);
    const secondBlock = schema.node('stageDirection', {id: 'second'}, [schema.text('Second')]);
    const doc = schema.node('doc', null, [firstBlock, secondBlock]);
    let state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 1),
    });
    let dispatchedTransaction: EditorState['tr'] | null = null;
    const editor = {
        get state() {
            return state;
        },
        view: {
            dispatch: (tr: EditorState['tr']) => {
                dispatchedTransaction = tr;
                state = state.apply(tr);
            },
        },
    } as unknown as TiptapEditor;

    return {
        editor,
        getDispatchedTransaction: () => dispatchedTransaction,
    };
};

describe('restoreSelectionForBlock', () => {
    it('preserves the selection without scrolling the moved block into view', () => {
        const {
            editor,
            getDispatchedTransaction,
        } = createEditor();

        restoreSelectionForBlock(editor, 'second');

        expect(editor.state.selection.$from.parent.attrs.id).toBe('second');
        expect(getDispatchedTransaction()?.scrolledIntoView).toBe(false);
    });
});
