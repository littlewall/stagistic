import {Schema} from '@tiptap/pm/model';
import {
    EditorState,
    TextSelection,
} from '@tiptap/pm/state';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {BlockNodeType} from '../scriptCore';
import {
    shouldBlockBackspace,
    shouldBlockForwardDelete,
} from './sceneDeletionGuard';

const createBlockSpec = (blockType: BlockNodeType) => ({
    group: 'block',
    content: 'text*',
    attrs: {
        id: {default: 'block-1'},
        blockType: {default: blockType},
    },
    toDOM: () => ['p', 0] as const,
    parseDOM: [{tag: 'p'}],
});

const schema = new Schema({
    nodes: {
        doc: {content: '(scene | stageDirection | dialogue)+'},
        text: {group: 'inline'},
        scene: createBlockSpec('scene'),
        stageDirection: createBlockSpec('stageDirection'),
        dialogue: createBlockSpec('dialogue'),
    },
    marks: {},
});

type BlockDescriptor = {type: BlockNodeType, text: string};

type Caret = {block: number, offset: number};

const buildState = (blocks: BlockDescriptor[], caret: Caret): EditorState => {
    const nodes = blocks.map(({type, text}, index) => schema.node(
        type,
        {blockType: type, id: `block-${index + 1}`},
        text ? [schema.text(text)] : undefined,
    ));
    const doc = schema.node('doc', null, nodes);

    let position = 0;

    for (let index = 0; index < caret.block; index += 1) {
        position += nodes[index].nodeSize;
    }

    position += 1 + caret.offset;

    return EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, position),
    });
};

describe('sceneDeletionGuard', () => {
    it('blocks Backspace at the start of a scene block', () => {
        const state = buildState([{type: 'scene', text: 'INT. HOUSE'}], {block: 0, offset: 0});

        expect(shouldBlockBackspace(state)).toBe(true);
    });

    it('does not block Backspace mid scene text', () => {
        const state = buildState([{type: 'scene', text: 'INT. HOUSE'}], {block: 0, offset: 4});

        expect(shouldBlockBackspace(state)).toBe(false);
    });

    it('does not block Backspace at the start of a non-scene block', () => {
        const state = buildState([{type: 'stageDirection', text: 'A room.'}], {block: 0, offset: 0});

        expect(shouldBlockBackspace(state)).toBe(false);
    });

    it('blocks forward Delete at end of block preceding a scene', () => {
        const state = buildState(
            [{type: 'stageDirection', text: 'A room.'}, {type: 'scene', text: 'INT. HOUSE'}],
            {block: 0, offset: 7},
        );

        expect(shouldBlockForwardDelete(state)).toBe(true);
    });

    it('does not block forward Delete when the next block is not a scene', () => {
        const state = buildState(
            [{type: 'stageDirection', text: 'A room.'}, {type: 'dialogue', text: 'Hi'}],
            {block: 0, offset: 7},
        );

        expect(shouldBlockForwardDelete(state)).toBe(false);
    });

    it('does not block forward Delete mid text', () => {
        const state = buildState(
            [{type: 'stageDirection', text: 'A room.'}, {type: 'scene', text: 'INT. HOUSE'}],
            {block: 0, offset: 3},
        );

        expect(shouldBlockForwardDelete(state)).toBe(false);
    });

    it('ignores non-collapsed selections', () => {
        const doc = buildState([{type: 'scene', text: 'INT. HOUSE'}], {block: 0, offset: 0});
        const ranged = EditorState.create({
            schema,
            doc: doc.doc,
            selection: TextSelection.create(doc.doc, 1, 5),
        });

        expect(shouldBlockBackspace(ranged)).toBe(false);
        expect(shouldBlockForwardDelete(ranged)).toBe(false);
    });
});
