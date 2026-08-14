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
import {handleTab} from './tab';

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
        doc: {content: '(character | dialogue | aside | lyrics | stageDirection)+'},
        text: {group: 'inline'},
        character: createBlockSpec('character'),
        dialogue: createBlockSpec('dialogue'),
        aside: createBlockSpec('aside'),
        lyrics: createBlockSpec('lyrics'),
        stageDirection: createBlockSpec('stageDirection'),
    },
    marks: {},
});

const createTabEvent = (modifiers: Partial<Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>> = {}) => {
    let wasPrevented = false;

    return {
        key: 'Tab',
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        ...modifiers,
        preventDefault: () => {
            wasPrevented = true;
        },
        wasPrevented: () => wasPrevented,
    } as unknown as KeyboardEvent & {wasPrevented: () => boolean};
};

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

const createMultiBlockEditor = (blocks: Array<{blockType: BlockNodeType, text: string}>) => {
    const nodes = blocks.map(({blockType, text}, index) => schema.node(
        blockType,
        {blockType, id: `block-${index + 1}`},
        text ? [schema.text(text)] : undefined,
    ));
    const doc = schema.node('doc', null, nodes);
    const lastNode = nodes.at(-1);

    if (!lastNode) {
        throw new Error('Expected at least one block');
    }

    const selectionPos = doc.content.size - lastNode.nodeSize + 1 + lastNode.textContent.length;
    let state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, selectionPos),
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
        getLastBlock: () => state.doc.lastChild,
    };
};

describe('handleTab', () => {
    it('converts dialogue to aside on plain Tab', () => {
        const {editor, getBlock} = createEditor('dialogue', 'Sing this');
        const event = createTabEvent();

        expect(handleTab(editor, event)).toBe(true);
        expect(event.wasPrevented()).toBe(true);
        expect(getBlock()?.type.name).toBe('aside');
        expect(getBlock()?.attrs.blockType).toBe('aside');
    });

    it('converts aside back to dialogue on plain Tab', () => {
        const {editor, getBlock} = createEditor('aside', 'Quietly');
        const event = createTabEvent();

        expect(handleTab(editor, event)).toBe(true);
        expect(event.wasPrevented()).toBe(true);
        expect(getBlock()?.type.name).toBe('dialogue');
        expect(getBlock()?.attrs.blockType).toBe('dialogue');
    });

    it('converts dialogue to lyrics on Option Tab', () => {
        const {editor, getBlock} = createEditor('dialogue', 'Sing this');
        const event = createTabEvent({altKey: true});

        expect(handleTab(editor, event)).toBe(true);
        expect(event.wasPrevented()).toBe(true);
        expect(getBlock()?.type.name).toBe('lyrics');
        expect(getBlock()?.attrs.blockType).toBe('lyrics');
    });

    it('converts lyrics to dialogue on Option Tab', () => {
        const {editor, getBlock} = createEditor('lyrics', 'Sing this');
        const event = createTabEvent({altKey: true});

        expect(handleTab(editor, event)).toBe(true);
        expect(event.wasPrevented()).toBe(true);
        expect(getBlock()?.type.name).toBe('dialogue');
        expect(getBlock()?.attrs.blockType).toBe('dialogue');
    });

    it('converts dialogue to lyrics on Ctrl Alt Tab fallback', () => {
        const {editor, getBlock} = createEditor('dialogue', 'Sing this');
        const event = createTabEvent({altKey: true, ctrlKey: true});

        expect(handleTab(editor, event)).toBe(true);
        expect(event.wasPrevented()).toBe(true);
        expect(getBlock()?.type.name).toBe('lyrics');
        expect(getBlock()?.attrs.blockType).toBe('lyrics');
    });

    it('converts character to stage direction on Option Tab', () => {
        const {editor, getBlock} = createEditor('character', 'HAMLET');
        const event = createTabEvent({altKey: true});

        expect(handleTab(editor, event)).toBe(true);
        expect(event.wasPrevented()).toBe(true);
        expect(getBlock()?.type.name).toBe('stageDirection');
        expect(getBlock()?.attrs.blockType).toBe('stageDirection');
    });

    it('converts stage direction to character on Option Tab', () => {
        const {editor, getBlock} = createEditor('stageDirection', 'HAMLET enters');
        const event = createTabEvent({altKey: true});

        expect(handleTab(editor, event)).toBe(true);
        expect(event.wasPrevented()).toBe(true);
        expect(getBlock()?.type.name).toBe('character');
        expect(getBlock()?.attrs.blockType).toBe('character');
    });

    it('converts lyrics to aside on plain Tab', () => {
        const {editor, getBlock} = createEditor('lyrics', 'Sing this');
        const event = createTabEvent();

        expect(handleTab(editor, event)).toBe(true);
        expect(event.wasPrevented()).toBe(true);
        expect(getBlock()?.type.name).toBe('aside');
        expect(getBlock()?.textContent).toBe('Sing this');
    });

    it('strips wrapping parens when Tab converts dialogue text already wrapped in them to aside', () => {
        const {editor, getBlock} = createEditor('dialogue', '(quietly)');
        const event = createTabEvent();

        expect(handleTab(editor, event)).toBe(true);
        expect(getBlock()?.type.name).toBe('aside');
        expect(getBlock()?.textContent).toBe('quietly');
    });

    it('does nothing on Shift Tab for dialogue (no more aside toggle)', () => {
        const {editor, getBlock} = createEditor('dialogue', 'Sing this');
        const event = createTabEvent({shiftKey: true});

        expect(handleTab(editor, event)).toBe(true);
        expect(event.wasPrevented()).toBe(true);
        expect(getBlock()?.type.name).toBe('dialogue');
    });

    it('does nothing on Shift Tab for lyrics (no more indent behavior)', () => {
        const {editor, getBlock} = createEditor('lyrics', 'Sing this');
        const event = createTabEvent({shiftKey: true});

        expect(handleTab(editor, event)).toBe(true);
        expect(event.wasPrevented()).toBe(true);
        expect(getBlock()?.type.name).toBe('lyrics');
        expect(getBlock()?.textContent).toBe('Sing this');
    });

    it('returns aside to lyrics when the nearest preceding non-aside block is lyrics', () => {
        const {editor, getLastBlock} = createMultiBlockEditor([
            {blockType: 'lyrics', text: 'La la la'},
            {blockType: 'aside', text: 'Quietly'},
        ]);
        const event = createTabEvent();

        expect(handleTab(editor, event)).toBe(true);
        expect(getLastBlock()?.type.name).toBe('lyrics');
    });

    it('returns aside to dialogue when the nearest preceding non-aside block is dialogue', () => {
        const {editor, getLastBlock} = createMultiBlockEditor([
            {blockType: 'dialogue', text: 'Hello there'},
            {blockType: 'aside', text: 'Quietly'},
        ]);
        const event = createTabEvent();

        expect(handleTab(editor, event)).toBe(true);
        expect(getLastBlock()?.type.name).toBe('dialogue');
    });

    it('skips over a run of consecutive asides to find the flow origin', () => {
        const {editor, getLastBlock} = createMultiBlockEditor([
            {blockType: 'lyrics', text: 'La la la'},
            {blockType: 'aside', text: 'First aside'},
            {blockType: 'aside', text: 'Second aside'},
        ]);
        const event = createTabEvent();

        expect(handleTab(editor, event)).toBe(true);
        expect(getLastBlock()?.type.name).toBe('lyrics');
    });

    it('defaults to dialogue when no preceding block establishes a flow', () => {
        const {editor, getBlock} = createEditor('aside', 'Quietly');
        const event = createTabEvent();

        expect(handleTab(editor, event)).toBe(true);
        expect(getBlock()?.type.name).toBe('dialogue');
    });

    it('defaults to dialogue when the nearest preceding non-aside block is neither dialogue nor lyrics', () => {
        const {editor, getLastBlock} = createMultiBlockEditor([
            {blockType: 'character', text: 'HAMLET'},
            {blockType: 'aside', text: 'Quietly'},
        ]);
        const event = createTabEvent();

        expect(handleTab(editor, event)).toBe(true);
        expect(getLastBlock()?.type.name).toBe('dialogue');
    });
});
