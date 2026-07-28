import {
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
} from '@stagistic/script';
import {Schema} from '@tiptap/pm/model';
import {
    EditorState,
    Plugin,
    TextSelection,
} from '@tiptap/pm/state';
import type {EditorView} from '@tiptap/pm/view';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {PLACEHOLDER_CHARACTER} from '../../tiptap/extensions/characterTagInput/constants';
import {createCharacterTagComposePlugin} from '../../tiptap/extensions/characterTagInput/plugin';
import {buildOpenComposeTransaction} from '../../tiptap/extensions/characterTagInput/transactions';
import {getCharacterTagComposeFromState} from '../../tiptap/extensions/CharacterTagInputExtension';
import {characterTagComposeKey} from '../../tiptap/extensions/CharacterTagInputExtension';
import {
    computeCharacterSuggestions,
    normalizePersistentCharacters,
} from './model';

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

const originalWindow = globalThis.window;

const createEditor = (query: string) => {
    const composeMark = schema.mark(CHARACTER_TAG_MARK_NAME, {
        characterKey: query.toLowerCase(),
        characterId: null,
    });
    const text = `${PLACEHOLDER_CHARACTER}${query}`;
    const block = schema.node('stageDirection', null, [schema.text(text, [composeMark])]);
    const doc = schema.node('doc', null, [block]);
    const state = EditorState.create({
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

    return {
        state,
        view: {
            coordsAtPos: (pos: number) => ({
                left: pos * 10,
                right: pos * 10,
                top: 12,
                bottom: 28,
            }),
        },
    } as unknown as TiptapEditor;
};

const createConfirmedTagEditor = (name: string, characterId: string, caret = 1 + name.length) => {
    const committedMark = schema.mark(CHARACTER_TAG_MARK_NAME, {
        characterKey: name.toLowerCase(),
        characterId,
    });
    const block = schema.node('stageDirection', null, [schema.text(name, [committedMark])]);
    const doc = schema.node('doc', null, [block]);
    const state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, caret),
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

    return {
        state,
        view: {
            coordsAtPos: (pos: number) => ({
                left: pos * 10,
                right: pos * 10,
                top: 12,
                bottom: 28,
            }),
        },
    } as unknown as TiptapEditor;
};

const createCanvas = () => {
    return {
        clientWidth: 480,
        scrollLeft: 0,
        scrollTop: 0,
        getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            right: 480,
            bottom: 320,
            width: 480,
            height: 320,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        }),
    } as unknown as HTMLElement;
};

const createComposeFlowState = () => {
    const plugin = createCharacterTagComposePlugin({} as TiptapEditor, {
        persistentCharactersRef: {current: []},
    });
    const block = schema.node('stageDirection');
    const doc = schema.node('doc', null, [block]);

    return EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 1),
        plugins: [plugin],
    });
};

const createMultiBlockComposeFlowState = () => {
    const plugin = createCharacterTagComposePlugin({} as TiptapEditor, {
        persistentCharactersRef: {current: []},
    });
    const firstBlock = schema.node('stageDirection', {id: 'block-1'});
    const secondBlock = schema.node('stageDirection', {id: 'block-2'}, [schema.text('Other')]);
    const doc = schema.node('doc', null, [firstBlock, secondBlock]);

    return EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 1),
        plugins: [plugin],
    });
};

const createView = (initialState: EditorState) => {
    const view = {
        state: initialState,
        dispatch: (tr: EditorState['tr']) => {
            const result = view.state.applyTransaction(tr);

            view.state = result.state;
        },
    } as unknown as EditorView & {state: EditorState};

    return view;
};

const readFirstCharacterTag = (state: EditorState) => {
    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];

    if (!markType) {
        throw new Error('Missing character tag mark type');
    }

    let text = '';
    let key = '';

    state.doc.nodesBetween(0, state.doc.content.size, child => {
        const mark = child.marks.find(candidate => candidate.type === markType);

        if (!mark || typeof child.text !== 'string') {
            return;
        }

        text = child.text;
        key = String(mark.attrs[CHARACTER_TAG_KEY_ATTR] ?? '');

        return false;
    });

    return {
        text,
        key,
    };
};

afterEach(() => {
    globalThis.window = originalWindow;
});

describe('computeCharacterSuggestions', () => {
    it('returns stage-direction character suggestions while typing in a compose tag', () => {
        globalThis.window = {
            getComputedStyle: () => ({
                getPropertyValue: () => '',
            }),
        } as unknown as Window & typeof globalThis;

        const result = computeCharacterSuggestions({
            editor: createEditor('J'),
            canvas: createCanvas(),
            normalizedPersistentCharacters: normalizePersistentCharacters([
                {
                    id: 'jan-id',
                    key: 'Jan',
                    colorHex: null,
                },
                {
                    id: 'josef-id',
                    key: 'Josef',
                    colorHex: null,
                },
                {
                    id: 'vaclav-id',
                    key: 'Vaclav',
                    colorHex: null,
                },
            ]),
            liveCountsByKey: new Map(),
            suppressedSelection: null,
        });

        if (!result || result.shouldKeepSuppressedSelection) {
            throw new Error('Expected compose suggestions');
        }

        expect(result.suggestions.map(entry => entry.key)).toEqual(['JAN', 'JOSEF']);
    });

    it('hides the already-confirmed character of a committed pill from its own suggestions', () => {
        globalThis.window = {
            getComputedStyle: () => ({
                getPropertyValue: () => '',
            }),
        } as unknown as Window & typeof globalThis;

        const result = computeCharacterSuggestions({
            editor: createConfirmedTagEditor('Jan', 'jan-id'),
            canvas: createCanvas(),
            normalizedPersistentCharacters: normalizePersistentCharacters([
                {
                    id: 'jan-id',
                    key: 'Jan',
                    colorHex: null,
                }, {
                    id: 'jana-id',
                    key: 'Jana',
                    colorHex: null,
                },
            ]),
            liveCountsByKey: new Map(),
            suppressedSelection: null,
        });

        if (!result || result.shouldKeepSuppressedSelection) {
            throw new Error('Expected compose suggestions');
        }

        expect(result.suggestions.map(entry => entry.key)).toEqual(['JANA']);
    });

    it('does not suggest while editing in the middle of a committed pill', () => {
        globalThis.window = {
            getComputedStyle: () => ({
                getPropertyValue: () => '',
            }),
        } as unknown as Window & typeof globalThis;

        // Caret sits inside "TOMMY" (between the two M's), not at the pill end.
        const result = computeCharacterSuggestions({
            editor: createConfirmedTagEditor('TOMMY', 'tommy-id', 4),
            canvas: createCanvas(),
            normalizedPersistentCharacters: normalizePersistentCharacters([
                {
                    id: 'tommy-id',
                    key: 'Tommy',
                    colorHex: null,
                },
            ]),
            liveCountsByKey: new Map(),
            suppressedSelection: null,
        });

        expect(result).toBeNull();
    });

    it('keeps compose state and suggestions through the real @ -> J typing flow', () => {
        globalThis.window = {
            getComputedStyle: () => ({
                getPropertyValue: () => '',
            }),
        } as unknown as Window & typeof globalThis;

        const view = createView(createComposeFlowState());
        const openComposeTransaction = buildOpenComposeTransaction(
            view.state,
            view.state.selection.from,
            view.state.selection.from,
        );

        if (!openComposeTransaction) {
            throw new Error('Expected open compose transaction');
        }

        view.dispatch(openComposeTransaction);
        expect(getCharacterTagComposeFromState(view.state)?.query).toBe('');

        const handleTextInput = view.state.plugins[0]?.props.handleTextInput;

        if (!handleTextInput) {
            throw new Error('Expected text input handler');
        }

        const from = view.state.selection.from;
        const handled = (handleTextInput as OmitThisParameter<typeof handleTextInput>)(
            view,
            from,
            from,
            'J',
            () => view.state.tr,
        );

        expect(handled).toBe(true);
        expect(getCharacterTagComposeFromState(view.state)?.query).toBe('J');
        expect(view.state.doc.textContent).toBe('J');

        const result = computeCharacterSuggestions({
            editor: {
                state: view.state,
                view: {
                    coordsAtPos: (pos: number) => ({
                        left: pos * 10,
                        right: pos * 10,
                        top: 12,
                        bottom: 28,
                    }),
                },
            } as unknown as TiptapEditor,
            canvas: createCanvas(),
            normalizedPersistentCharacters: normalizePersistentCharacters([
                {
                    id: 'johny-id',
                    key: 'Johny',
                    colorHex: null,
                },
            ]),
            liveCountsByKey: new Map(),
            suppressedSelection: null,
        });

        if (!result || result.shouldKeepSuppressedSelection) {
            throw new Error('Expected real-flow compose suggestions');
        }

        expect(result.suggestions.map(entry => entry.key)).toEqual(['JOHNY']);
    });

    it('keeps compose state across no-op transactions after opening a tag', () => {
        const view = createView(createComposeFlowState());
        const openComposeTransaction = buildOpenComposeTransaction(
            view.state,
            view.state.selection.from,
            view.state.selection.from,
        );

        if (!openComposeTransaction) {
            throw new Error('Expected open compose transaction');
        }

        view.dispatch(openComposeTransaction);
        expect(getCharacterTagComposeFromState(view.state)?.query).toBe('');

        view.dispatch(view.state.tr);

        expect(getCharacterTagComposeFromState(view.state)?.query).toBe('');
    });

    it('preserves a typed compose tag when selection moves to another block', () => {
        const view = createView(createMultiBlockComposeFlowState());
        const openComposeTransaction = buildOpenComposeTransaction(
            view.state,
            view.state.selection.from,
            view.state.selection.from,
        );

        if (!openComposeTransaction) {
            throw new Error('Expected open compose transaction');
        }

        view.dispatch(openComposeTransaction);

        const handleTextInput = view.state.plugins[0]?.props.handleTextInput;

        if (!handleTextInput) {
            throw new Error('Expected text input handler');
        }

        const from = view.state.selection.from;
        const handled = (handleTextInput as OmitThisParameter<typeof handleTextInput>)(
            view,
            from,
            from,
            'J',
            () => view.state.tr,
        );

        expect(handled).toBe(true);
        expect(getCharacterTagComposeFromState(view.state)?.query).toBe('J');

        const secondBlockSelection = 4;

        view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, secondBlockSelection)));

        expect(getCharacterTagComposeFromState(view.state)).toBeNull();
        expect(readFirstCharacterTag(view.state)).toEqual({
            text: 'J',
            key: 'J',
        });
    });
});
