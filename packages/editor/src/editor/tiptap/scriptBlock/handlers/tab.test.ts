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
        doc: {content: '(dialogue | lyrics | stageDirection)+'},
        text: {group: 'inline'},
        dialogue: createBlockSpec('dialogue'),
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

describe('handleTab', () => {
    it('keeps plain Tab from converting dialogue to lyrics', () => {
        const {editor, getBlock} = createEditor('dialogue', 'Sing this');
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

    it('keeps lyrics indentation behavior', () => {
        const {editor, getBlock} = createEditor('lyrics', 'Sing this');
        const event = createTabEvent();

        expect(handleTab(editor, event)).toBe(true);
        expect(event.wasPrevented()).toBe(true);
        expect(getBlock()?.type.name).toBe('lyrics');
        expect(getBlock()?.textContent).toBe('\tSing this');
    });
});
