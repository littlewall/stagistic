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

import {
    PENDING_TAG_SPACE_CHARACTER,
    PLACEHOLDER_CHARACTER,
} from './constants';
import {
    buildAbandonComposeTransaction,
    buildEditCommittedTagTransaction,
    buildOpenComposeTransaction,
    buildTrailingTagSpaceCleanupTransaction,
} from './transactions';

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

const createMarkedState = (text: string) => {
    const mark = schema.mark(CHARACTER_TAG_MARK_NAME, {
        characterKey: text,
        characterId: null,
    });
    const block = schema.node('stageDirection', null, [schema.text(text, [mark])]);
    const doc = schema.node('doc', null, [block]);

    return EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 1 + text.length),
    });
};

const createTwoBlockMarkedStates = (text: string) => {
    const mark = schema.mark(CHARACTER_TAG_MARK_NAME, {
        characterKey: text,
        characterId: null,
    });
    const firstBlock = schema.node('stageDirection', null, [schema.text(text, [mark])]);
    const secondBlock = schema.node('stageDirection', null, [schema.text('NEXT')]);
    const doc = schema.node('doc', null, [firstBlock, secondBlock]);

    return {
        oldState: EditorState.create({
            schema,
            doc,
            selection: TextSelection.create(doc, 1 + text.length),
        }),
        newState: EditorState.create({
            schema,
            doc,
            selection: TextSelection.create(doc, firstBlock.nodeSize + 1),
        }),
    };
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

    it('does not open compose at the end of an active character tag', () => {
        const state = createMarkedState(`JOHNNY${PENDING_TAG_SPACE_CHARACTER}`);
        const tr = buildOpenComposeTransaction(state, state.selection.from, state.selection.from);

        expect(tr).toBeNull();
    });

    it('trims a regular trailing space when compose is abandoned', () => {
        const state = createMarkedState('JOHNNY ');
        const tr = buildAbandonComposeTransaction(state, 1);

        if (!tr) {
            throw new Error('Expected abandon transaction');
        }

        const nextState = state.apply(tr);

        expect(getStageDirectionText(nextState.doc)).toBe('JOHNNY');
    });

    it('trims a pending trailing space when compose is abandoned', () => {
        const state = createMarkedState(`JOHNNY${PENDING_TAG_SPACE_CHARACTER}`);
        const tr = buildAbandonComposeTransaction(state, 1);

        if (!tr) {
            throw new Error('Expected abandon transaction');
        }

        const nextState = state.apply(tr);

        expect(getStageDirectionText(nextState.doc)).toBe('JOHNNY');
    });

    it('trims a pending trailing space when selection leaves an existing tag', () => {
        const {
            oldState,
            newState,
        } = createTwoBlockMarkedStates(`JOHNNY${PENDING_TAG_SPACE_CHARACTER}`);
        const tr = buildTrailingTagSpaceCleanupTransaction(oldState, newState);

        if (!tr) {
            throw new Error('Expected cleanup transaction');
        }

        const nextState = newState.apply(tr);

        expect(getStageDirectionText(nextState.doc)).toBe('JOHNNY');
    });

    it('keeps a pending trailing space while selection stays in the existing tag', () => {
        const state = createMarkedState(`JOHNNY${PENDING_TAG_SPACE_CHARACTER}`);
        const tr = buildTrailingTagSpaceCleanupTransaction(state, state);

        expect(tr).toBeNull();
    });
});

describe('buildEditCommittedTagTransaction', () => {
    it('opens compose over the complete existing character tag', () => {
        const state = createMarkedState('JOHNY');
        const tr = buildEditCommittedTagTransaction(state, 3);

        if (!tr) {
            throw new Error('Expected edit transaction');
        }

        const nextState = state.apply(tr);

        expect(nextState.selection.from).toBe(6);
        expect(tr.getMeta('character-tag-compose-open')).toBe(1);
    });

    it('ignores clicks outside a character tag', () => {
        const state = createState('Plain text');

        expect(buildEditCommittedTagTransaction(state, 3)).toBeNull();
    });
});
