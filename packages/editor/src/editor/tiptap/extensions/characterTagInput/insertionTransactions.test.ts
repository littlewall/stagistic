import {CHARACTER_TAG_MARK_NAME} from '@stagistic/script';
import {Schema} from '@tiptap/pm/model';
import {
    EditorState,
    Plugin,
    TextSelection,
} from '@tiptap/pm/state';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {characterTagComposeKey} from './composeState';
import {PLACEHOLDER_CHARACTER} from './constants';
import {
    buildCommitTransaction,
    buildOpenComposeTransaction,
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
        },
    },
    marks: {
        [CHARACTER_TAG_MARK_NAME]: {
            attrs: {
                characterKey: {default: ''},
                characterId: {default: null},
            },
        },
    },
});

const createPlainState = (text: string, selectionOffset: number) => {
    const block = schema.node('stageDirection', null, [schema.text(text)]);
    const doc = schema.node('doc', null, [block]);

    return EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 1 + selectionOffset),
    });
};

const createComposingState = () => {
    const mark = schema.mark(CHARACTER_TAG_MARK_NAME, {
        characterKey: 'ANNA',
        characterId: null,
    });
    const block = schema.node('stageDirection', null, [
        schema.text('Hel '),
        schema.text('ANNA', [mark]),
        schema.text(' lo'),
    ]);
    const doc = schema.node('doc', null, [block]);

    return EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 9),
        plugins: [
            new Plugin({
                key: characterTagComposeKey,
                state: {
                    init: () => ({from: 5}),
                    apply: (_, value) => value,
                },
            }),
        ],
    });
};

describe('character tag insertion transactions', () => {
    it('splits a word with one space on each side of compose', () => {
        const state = createPlainState('Hello', 3);
        const tr = buildOpenComposeTransaction(state, state.selection.from, state.selection.from);

        if (!tr) {
            throw new Error('Expected compose transaction');
        }

        const nextState = state.apply(tr);

        expect(nextState.doc.textContent).toBe(`Hel ${PLACEHOLDER_CHARACTER} lo`);
        expect(nextState.selection.$from.nodeBefore?.text).toBe(PLACEHOLDER_CHARACTER);
    });

    it('reuses an existing trailing separator when compose is committed', () => {
        const state = createComposingState();
        const tr = buildCommitTransaction(state, [], {
            name: 'ANNA',
            trailingSpace: true,
        });

        if (!tr) {
            throw new Error('Expected commit transaction');
        }

        expect(state.apply(tr).doc.textContent).toBe('Hel ANNA lo');
    });
});
