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

import type {BlockNodeType} from '../scriptCore';
import {updateBlockType} from './commands';

const createBlockSpec = (blockType: BlockNodeType) => ({
    group: 'block',
    content: 'text*',
    attrs: {
        id: {default: 'block-1'},
        blockType: {default: blockType},
    },
    toDOM: () => ['p', 0],
    parseDOM: [{tag: 'p'}],
});

const schema = new Schema({
    nodes: {
        doc: {content: '(character | stageDirection | dialogue)+'},
        text: {group: 'inline'},
        character: createBlockSpec('character'),
        stageDirection: createBlockSpec('stageDirection'),
        dialogue: createBlockSpec('dialogue'),
    },
    marks: {},
});

const createEditor = (blockType: BlockNodeType, text: string) => {
    const block = schema.node(blockType, {blockType, id: 'block-1'}, text ? [schema.text(text)] : undefined);
    const doc = schema.node('doc', null, [block]);
    let state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 1 + text.length),
    });
    const editor = {
        get state() {
            return state;
        },
        schema,
        view: {
            focus: () => {},
            dispatch: (tr: EditorState['tr']) => {
                state = state.apply(tr);
            },
        },
        commands: {
            focus: () => true,
        },
    } as unknown as TiptapEditor;

    return {
        editor,
        getBlock: () => state.doc.firstChild,
    };
};

describe('updateBlockType', () => {
    it('normalizes a legacy + delimiter to / when converting a block to a character cue', () => {
        const {editor, getBlock} = createEditor('stageDirection', 'SALLY+ISABELLA');

        expect(updateBlockType(editor, 'character')).toBe(true);
        expect(getBlock()?.type.name).toBe('character');
        expect(getBlock()?.textContent).toBe('SALLY/ISABELLA');
    });

    it('leaves already-canonical character text untouched', () => {
        const {editor, getBlock} = createEditor('stageDirection', 'ANNA/PETER');

        expect(updateBlockType(editor, 'character')).toBe(true);
        expect(getBlock()?.textContent).toBe('ANNA/PETER');
    });

    it('does not touch text when converting to a non-character block type', () => {
        const {editor, getBlock} = createEditor('character', 'SALLY+ISABELLA');

        expect(updateBlockType(editor, 'stageDirection')).toBe(true);
        expect(getBlock()?.textContent).toBe('SALLY+ISABELLA');
    });
});
