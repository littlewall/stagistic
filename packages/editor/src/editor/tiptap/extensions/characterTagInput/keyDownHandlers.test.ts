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
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {characterTagComposeKey} from './composeState';
import {PLACEHOLDER_CHARACTER} from './constants';
import {createCharacterTagKeyDownHandler} from './keyDownHandlers';

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

const createState = (selectionFrom: number) => {
    const annaMark = schema.mark(CHARACTER_TAG_MARK_NAME, {
        characterKey: 'anna',
        characterId: 'anna-id',
    });
    const bobMark = schema.mark(CHARACTER_TAG_MARK_NAME, {
        characterKey: 'bob',
        characterId: 'bob-id',
    });
    const block = schema.node('stageDirection', null, [
        schema.text('ANNA', [annaMark]),
        schema.text(' '),
        schema.text('BOB', [bobMark]),
    ]);
    const doc = schema.node('doc', null, [block]);

    return EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, selectionFrom),
    });
};

const createComposeState = (query: string) => {
    const composeMark = schema.mark(CHARACTER_TAG_MARK_NAME, {
        characterKey: query.toLowerCase(),
        characterId: null,
    });
    const text = `${PLACEHOLDER_CHARACTER}${query}`;
    const block = schema.node('stageDirection', null, [schema.text(text, [composeMark])]);
    const doc = schema.node('doc', null, [block]);

    return EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 1 + text.length),
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

const createSingleTagState = (text: string, characterId: string | null) => {
    const mark = schema.mark(CHARACTER_TAG_MARK_NAME, {
        characterKey: text.toLowerCase(),
        characterId,
    });
    const block = schema.node('stageDirection', null, [schema.text(text, [mark])]);
    const doc = schema.node('doc', null, [block]);

    return EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 1 + text.length),
    });
};

const resolveTagRanges = (state: EditorState) => {
    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];

    if (!markType) {
        throw new Error('Missing character tag mark type');
    }

    const firstRange = getMarkRange(state.doc.resolve(1), markType);
    const secondRange = getMarkRange(state.doc.resolve(6), markType);

    if (!firstRange || !secondRange) {
        throw new Error('Expected both tag ranges');
    }

    return {
        firstRange,
        secondRange,
    };
};

const createView = (state: EditorState) => {
    let didDispatch = false;

    const view = {
        state,
        dispatch: (tr: EditorState['tr']) => {
            view.state = view.state.apply(tr);
            didDispatch = true;
        },
    } as unknown as EditorView & {state: EditorState};

    return {
        view,
        getDidDispatch: () => didDispatch,
    };
};

const createPlaceholderOnlyState = () => {
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
    });
};

const createEditorWithCommitCapture = () => {
    let payload: unknown = null;

    return {
        editor: {
            commands: {
                commitCharacterTag: (nextPayload?: unknown) => {
                    payload = nextPayload ?? null;

                    return true;
                },
            },
        } as unknown as TiptapEditor,
        getPayload: () => payload,
    };
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

describe('createCharacterTagKeyDownHandler', () => {
    it('blocks backspace from deleting the separator between two tags', () => {
        const baseState = createState(1);
        const {secondRange} = resolveTagRanges(baseState);
        const state = createState(secondRange.from);
        const {
            view,
            getDidDispatch,
        } = createView(state);
        const handler = createCharacterTagKeyDownHandler({} as TiptapEditor);

        const handled = handler(view, {key: 'Backspace'} as KeyboardEvent);

        expect(handled).toBe(true);
        expect(getDidDispatch()).toBe(false);
    });

    it('blocks delete from deleting the separator between two tags', () => {
        const baseState = createState(1);
        const {firstRange} = resolveTagRanges(baseState);
        const state = createState(firstRange.to);
        const {
            view,
            getDidDispatch,
        } = createView(state);
        const handler = createCharacterTagKeyDownHandler({} as TiptapEditor);

        const handled = handler(view, {key: 'Delete'} as KeyboardEvent);

        expect(handled).toBe(true);
        expect(getDidDispatch()).toBe(false);
    });

    it('commits compose with trailing space on Enter', () => {
        const state = createComposeState('JOHNNY');
        const {view} = createView(state);
        const {
            editor,
            getPayload,
        } = createEditorWithCommitCapture();
        const handler = createCharacterTagKeyDownHandler(editor);

        const handled = handler(view, {key: 'Enter'} as KeyboardEvent);

        expect(handled).toBe(true);
        expect(getPayload()).toEqual({trailingSpace: true});
    });

    it('commits compose with trailing space on Tab', () => {
        const state = createComposeState('JOHNNY');
        const {view} = createView(state);
        const {
            editor,
            getPayload,
        } = createEditorWithCommitCapture();
        const handler = createCharacterTagKeyDownHandler(editor);

        const handled = handler(view, {key: 'Tab'} as KeyboardEvent);

        expect(handled).toBe(true);
        expect(getPayload()).toEqual({trailingSpace: true});
    });

    it('removes an empty tag on Enter even when compose state is absent', () => {
        const state = createPlaceholderOnlyState();
        const {view} = createView(state);
        const handler = createCharacterTagKeyDownHandler({} as TiptapEditor);

        const handled = handler(view, {key: 'Enter'} as KeyboardEvent);

        expect(handled).toBe(true);
        expect(view.state.doc.textContent).toBe('');
    });

    it('replaces an empty tag with plain space on Space when compose state is absent', () => {
        const state = createPlaceholderOnlyState();
        const {view} = createView(state);
        const handler = createCharacterTagKeyDownHandler({} as TiptapEditor);

        const handled = handler(view, {key: ' '} as KeyboardEvent);

        expect(handled).toBe(true);
        expect(view.state.doc.textContent).toBe(' ');
        expect(view.state.selection.from).toBe(2);
    });

    it('clears confirmed character identity on the first backspace when the name diverges', () => {
        const state = createSingleTagState('JOHNNY', 'johnny-id');
        const {view} = createView(state);
        const handler = createCharacterTagKeyDownHandler(
            {} as TiptapEditor,
            () => [{id: 'johnny-id', key: 'JOHNNY'}],
        );

        const handled = handler(view, {key: 'Backspace'} as KeyboardEvent);

        expect(handled).toBe(true);
        expect(readOnlyTagIdentity(view.state)).toEqual({
            text: 'JOHNN',
            characterKey: 'JOHNN',
            characterId: null,
        });
    });
});
