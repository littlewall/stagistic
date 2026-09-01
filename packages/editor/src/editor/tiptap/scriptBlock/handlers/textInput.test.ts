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

import type {BlockNodeType} from '../../scriptCore';
import {getActiveScriptBlockFromState} from '../../scriptCore';
import {createBlockContext} from '../context';
import {
    handleTextInput,
    textInputHandlerMaps,
} from './textInput';

const createBlockSpec = (blockType: BlockNodeType) => ({
    group: 'block',
    content: 'text*',
    attrs: {
        id: {default: `${blockType}-1`},
        blockType: {default: blockType},
    },
    toDOM: () => ['p', 0] as const,
    parseDOM: [{tag: 'p'}],
});

const schema = new Schema({
    nodes: {
        doc: {content: '(character | aside | note)+'},
        text: {group: 'inline'},
        character: createBlockSpec('character'),
        aside: createBlockSpec('aside'),
        note: createBlockSpec('note'),
    },
    marks: {},
});

const createEditor = (text: string, blockType: BlockNodeType = 'character') => {
    const block = schema.node(
        blockType,
        {id: `${blockType}-1`, blockType},
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

describe('handleTextInput note delimiters', () => {
    it('strips manually entered square brackets from inserted text', () => {
        const {
            editor,
            dispatchedTexts,
            getState,
        } = createEditor('Rewrite ', 'note');

        const handled = handleTextInput(editor, 9, 9, '[[draft]]');

        expect(handled).toBe(true);
        expect(dispatchedTexts).toEqual(['Rewrite draft']);
        expect(getState().doc.textContent).toBe('Rewrite draft');
    });

    it('prevents a bracket key before it reaches note content', () => {
        const {editor} = createEditor('Rewrite', 'note');
        const block = getActiveScriptBlockFromState(editor.state);

        if (!block) {
            throw new Error('Expected an active note block');
        }

        let prevented = false;
        const event = {
            key: '[',
            preventDefault: () => {
                prevented = true;
            },
        } as KeyboardEvent;
        const handled = textInputHandlerMaps.keyDownHandlers.note?.(
            createBlockContext(editor, block),
            event,
        );

        expect(handled).toBe(true);
        expect(prevented).toBe(true);
    });
});
