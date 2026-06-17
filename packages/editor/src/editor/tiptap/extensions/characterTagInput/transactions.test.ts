import {CHARACTER_TAG_MARK_NAME} from '@stagistic/script';
import {
    type Node as ProseMirrorNode,
    Schema,
} from '@tiptap/pm/model';
import {
    EditorState,
    TextSelection,
} from '@tiptap/pm/state';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {PLACEHOLDER_CHARACTER} from './constants';
import {buildOpenComposeTransaction} from './transactions';

const schema = new Schema({
    nodes: {
        doc: {content: 'stageDirection+'},
        text: {group: 'inline'},
        stageDirection: {
            group: 'block',
            content: 'text*',
            attrs: {
                id: {default: 'block-1'},
                blockType: {default: 'stageDirection'},
            },
            toDOM: () => ['p', 0],
            parseDOM: [{tag: 'p'}],
        },
    },
    marks: {
        [CHARACTER_TAG_MARK_NAME]: {
            attrs: {
                characterKey: {default: ''},
                characterId: {default: null},
            },
            toDOM: () => ['span', 0],
            parseDOM: [{tag: 'span'}],
        },
    },
});

const createState = (text: string) => {
    const block = schema.node(
        'stageDirection',
        null,
        text.length > 0 ? [schema.text(text)] : undefined,
    );
    const doc = schema.node('doc', null, [block]);
    const selection = TextSelection.create(doc, 1 + text.length);

    return EditorState.create({
        schema,
        doc,
        selection,
    });
};

const getStageDirectionText = (doc: ProseMirrorNode) => {
    return doc.firstChild?.textContent ?? '';
};
const getNodeBeforeSelection = (state: EditorState) => {
    return state.selection.$from.nodeBefore;
};

describe('buildOpenComposeTransaction', () => {
    it('opens compose at an existing word boundary without adding another space', () => {
        const state = createState('Hello ');
        const tr = buildOpenComposeTransaction(state, state.selection.from, state.selection.from);

        if (!tr) {
            throw new Error('Expected compose transaction');
        }

        const nextState = state.apply(tr);
        const nodeBeforeSelection = getNodeBeforeSelection(nextState);

        expect(getStageDirectionText(nextState.doc)).toBe(`Hello ${PLACEHOLDER_CHARACTER}`);
        expect(nextState.selection.from).toBe(8);
        expect(nodeBeforeSelection?.text).toBe(PLACEHOLDER_CHARACTER);
        expect(nodeBeforeSelection?.marks.some(mark => mark.type.name === CHARACTER_TAG_MARK_NAME)).toBe(true);
    });

    it('inserts a separating space before compose when @ is typed after text', () => {
        const state = createState('Hello');
        const tr = buildOpenComposeTransaction(state, state.selection.from, state.selection.from);

        if (!tr) {
            throw new Error('Expected compose transaction');
        }

        const nextState = state.apply(tr);
        const nodeBeforeSelection = getNodeBeforeSelection(nextState);

        expect(getStageDirectionText(nextState.doc)).toBe(`Hello ${PLACEHOLDER_CHARACTER}`);
        expect(nextState.selection.from).toBe(8);
        expect(nodeBeforeSelection?.text).toBe(PLACEHOLDER_CHARACTER);
        expect(nodeBeforeSelection?.marks.some(mark => mark.type.name === CHARACTER_TAG_MARK_NAME)).toBe(true);
    });
});
