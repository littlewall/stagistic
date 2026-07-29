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

import {handleTextInput} from './textInput';

const schema = new Schema({
    nodes: {
        doc: {content: 'character+'},
        text: {group: 'inline'},
        character: {
            group: 'block',
            content: 'text*',
            attrs: {
                id: {default: 'character-1'},
                blockType: {default: 'character'},
            },
            toDOM: () => ['p', 0],
            parseDOM: [{tag: 'p'}],
        },
    },
    marks: {},
});

const createEditor = (text: string) => {
    const block = schema.node(
        'character',
        {id: 'character-1', blockType: 'character'},
        text ? [schema.text(text)] : undefined,
    );
    const doc = schema.node('doc', null, [block]);
    let state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 1 + text.length),
    });
    const dispatchedTexts: string[] = [];
    const editor = {
        get state() {
            return state;
        },
        view: {
            dispatch: (tr: EditorState['tr']) => {
                state = state.apply(tr);
                dispatchedTexts.push(state.doc.textContent);
            },
        },
    } as unknown as TiptapEditor;

    return {
        editor,
        dispatchedTexts,
        getState: () => state,
    };
};

describe('handleTextInput character delimiters', () => {
    it('dispatches a canonical delimiter without publishing preceding whitespace', () => {
        const {
            editor,
            dispatchedTexts,
            getState,
        } = createEditor('ALEX ');

        const handled = handleTextInput(editor, 6, 6, '/');

        expect(handled).toBe(true);
        expect(dispatchedTexts).toEqual(['ALEX/']);
        expect(getState().selection.from).toBe(6);
    });

    it('normalizes the legacy plus delimiter in the same atomic update', () => {
        const {
            editor,
            dispatchedTexts,
            getState,
        } = createEditor('ALEX ');

        const handled = handleTextInput(editor, 6, 6, '+');

        expect(handled).toBe(true);
        expect(dispatchedTexts).toEqual(['ALEX/']);
        expect(getState().selection.from).toBe(6);
    });

    it('keeps a slash literal while typing inside parentheses', () => {
        const {
            editor,
            dispatchedTexts,
            getState,
        } = createEditor('ALEX (V');

        const handled = handleTextInput(editor, 8, 8, '/');

        expect(handled).toBe(true);
        expect(dispatchedTexts).toEqual(['ALEX (V/']);
        expect(getState().selection.from).toBe(9);
    });
});
