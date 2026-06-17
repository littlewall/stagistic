import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
} from '@stagistic/script';
import {getMarkRange} from '@tiptap/core';
import {Schema} from '@tiptap/pm/model';
import {
    EditorState,
    Plugin,
    TextSelection,
} from '@tiptap/pm/state';
import type {EditorView} from '@tiptap/pm/view';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {characterTagComposeKey} from './composeState';
import {PLACEHOLDER_CHARACTER} from './constants';
import {createCharacterTagTextInputHandler} from './textInputHandlers';

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

const createState = (
    text = 'JOE',
    {
        characterKey = text.toLowerCase(),
        characterId = 'joe-id',
        trailingSpace = true,
    }: {
        characterKey?: string,
        characterId?: string | null,
        trailingSpace?: boolean,
    } = {},
) => {
    const joeMark = schema.mark(CHARACTER_TAG_MARK_NAME, {
        characterKey,
        characterId,
    });
    const content = [schema.text(text, [joeMark])];

    if (trailingSpace) {
        content.push(schema.text(' '));
    }

    const block = schema.node('stageDirection', null, content);
    const doc = schema.node('doc', null, [block]);

    return EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 1 + text.length + (trailingSpace ? 1 : 0)),
    });
};

const createEmptyComposeState = () => {
    const placeholderMark = schema.mark(CHARACTER_TAG_MARK_NAME, {
        characterKey: '',
        characterId: null,
    });
    const block = schema.node('stageDirection', null, [schema.text(PLACEHOLDER_CHARACTER, [placeholderMark])]);
    const doc = schema.node('doc', null, [block]);

    return EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 2),
        plugins: [
            new Plugin({
                key: characterTagComposeKey,
                state: {
                    init: () => ({from: 1}),
                    apply: (_, value) => value,
                },
            }),
        ],
    });
};

const createView = (initialState: EditorState) => {
    const view = {
        state: initialState,
        dispatch: (tr: EditorState['tr']) => {
            view.state = view.state.apply(tr);
        },
    } as unknown as EditorView & {state: EditorState};

    return view;
};

const readOnlyTagIdentity = (state: EditorState) => {
    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];

    if (!markType) {
        throw new Error('Missing character tag mark type');
    }

    const range = getMarkRange(state.doc.resolve(1), markType);

    if (!range) {
        throw new Error('Expected a tag range');
    }

    let characterId: string | null = null;
    let characterKey = '';

    state.doc.nodesBetween(range.from, range.to, child => {
        const mark = child.marks.find(candidate => candidate.type === markType);

        if (!mark) {
            return;
        }

        characterKey = String(mark.attrs[CHARACTER_TAG_KEY_ATTR] ?? '');
        characterId = typeof mark.attrs[CHARACTER_TAG_ID_ATTR] === 'string'
            ? mark.attrs[CHARACTER_TAG_ID_ATTR]
            : null;
    });

    return {
        text: state.doc.textBetween(range.from, range.to),
        characterKey,
        characterId,
    };
};

describe('createCharacterTagTextInputHandler', () => {
    it('replaces the trailing space after a tag with punctuation', () => {
        const view = createView(createState());
        const handler = createCharacterTagTextInputHandler(() => []);

        const handled = handler(view, 5, 5, ',');

        expect(handled).toBe(true);
        expect(view.state.doc.textContent).toBe('JOE,');
        expect(view.state.selection.from).toBe(5);
    });

    it('does not swallow regular alphanumeric typing after the trailing space', () => {
        const view = createView(createState());
        const handler = createCharacterTagTextInputHandler(() => []);

        const handled = handler(view, 5, 5, 'A');

        expect(handled).toBe(false);
        expect(view.state.doc.textContent).toBe('JOE ');
        expect(view.state.selection.from).toBe(5);
    });

    it('replaces an empty compose tag with plain space on Space input', () => {
        const view = createView(createEmptyComposeState());
        const handler = createCharacterTagTextInputHandler(() => []);

        const handled = handler(view, 2, 2, ' ');

        expect(handled).toBe(true);
        expect(view.state.doc.textContent).toBe(' ');
        expect(view.state.selection.from).toBe(2);
    });

    it('clears confirmed character identity when typing makes the tag diverge', () => {
        const view = createView(createState('JOHNNY', {
            characterKey: 'JOHNNY',
            characterId: 'johnny-id',
            trailingSpace: false,
        }));
        const handler = createCharacterTagTextInputHandler(() => [{id: 'johnny-id', key: 'JOHNNY'}]);

        const handled = handler(view, 7, 7, 'S');

        expect(handled).toBe(true);
        expect(readOnlyTagIdentity(view.state)).toEqual({
            text: 'JOHNNYS',
            characterKey: 'JOHNNYS',
            characterId: null,
        });
    });
});
