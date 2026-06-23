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
import {handleBlockShortcut} from './shortcuts';
import type {BlockShortcutMap} from './types';

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
        doc: {content: '(dialogue | lyrics | stageDirection)+'},
        text: {group: 'inline'},
        dialogue: createBlockSpec('dialogue'),
        lyrics: createBlockSpec('lyrics'),
        stageDirection: createBlockSpec('stageDirection'),
    },
    marks: {},
});

const blockShortcuts: BlockShortcutMap = {
    dialogue: '2',
    lyrics: '3',
};

const withNavigatorPlatform = (platform: string, callback: () => void) => {
    const originalNavigator = globalThis.navigator;

    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
            platform,
            userAgent: platform,
        },
    });

    try {
        callback();
    } finally {
        Object.defineProperty(globalThis, 'navigator', {
            configurable: true,
            value: originalNavigator,
        });
    }
};

const createShortcutEvent = (
    key: string,
    code: string,
    modifiers: Partial<Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>> = {},
) => {
    let wasPrevented = false;

    return {
        key,
        code,
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

describe('handleBlockShortcut', () => {
    it('converts using Alt digit shortcuts', () => {
        const {editor, getBlock} = createEditor('stageDirection', 'Sing this');
        const event = createShortcutEvent('2', 'Digit2', {altKey: true});

        expect(handleBlockShortcut(editor, event, blockShortcuts)).toBe(true);
        expect(event.wasPrevented()).toBe(true);
        expect(getBlock()?.type.name).toBe('dialogue');
        expect(getBlock()?.attrs.blockType).toBe('dialogue');
    });

    it('uses physical digit code when Option changes the produced key', () => {
        const {editor, getBlock} = createEditor('stageDirection', 'Sing this');
        const event = createShortcutEvent('™', 'Digit2', {altKey: true});

        expect(handleBlockShortcut(editor, event, blockShortcuts)).toBe(true);
        expect(event.wasPrevented()).toBe(true);
        expect(getBlock()?.type.name).toBe('dialogue');
        expect(getBlock()?.attrs.blockType).toBe('dialogue');
    });

    it('supports Ctrl Alt digit as a Windows fallback', () => {
        withNavigatorPlatform('Win32', () => {
            const {editor, getBlock} = createEditor('dialogue', 'Sing this');
            const event = createShortcutEvent('3', 'Digit3', {altKey: true, ctrlKey: true});

            expect(handleBlockShortcut(editor, event, blockShortcuts)).toBe(true);
            expect(event.wasPrevented()).toBe(true);
            expect(getBlock()?.type.name).toBe('lyrics');
            expect(getBlock()?.attrs.blockType).toBe('lyrics');
        });
    });

    it('does not use browser-reserved Ctrl digit shortcuts', () => {
        const {editor, getBlock} = createEditor('stageDirection', 'Sing this');
        const event = createShortcutEvent('2', 'Digit2', {ctrlKey: true});

        expect(handleBlockShortcut(editor, event, blockShortcuts)).toBe(false);
        expect(event.wasPrevented()).toBe(false);
        expect(getBlock()?.type.name).toBe('stageDirection');
        expect(getBlock()?.attrs.blockType).toBe('stageDirection');
    });
});
