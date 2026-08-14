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
import {getActiveScriptBlockFromState} from '../../scriptCore';
import {handleEnter} from './enter';

const DIALOGUE_LIKE_BLOCK_TYPES = ['dialogue', 'lyrics'] as const;

const createBlockSpec = (blockType: BlockNodeType) => ({
    group: 'block',
    content: 'text*',
    attrs: {
        id: {default: 'block-1'},
        blockType: {default: blockType},
        characterRefs: {default: null},
    },
    toDOM: () => ['p', 0] as const,
    parseDOM: [{tag: 'p'}],
});

const schema = new Schema({
    nodes: {
        doc: {content: 'block+'},
        text: {group: 'inline'},
        character: createBlockSpec('character'),
        dialogue: createBlockSpec('dialogue'),
        lyrics: createBlockSpec('lyrics'),
    },
    marks: {},
});

const createEnterEvent = (shiftKey = false) => {
    let wasPrevented = false;

    return {
        key: 'Enter',
        shiftKey,
        preventDefault: () => {
            wasPrevented = true;
        },
        wasPrevented: () => wasPrevented,
    } as unknown as KeyboardEvent & {wasPrevented: () => boolean};
};

const createEditor = (blockType: BlockNodeType) => {
    const block = schema.node(blockType, {blockType, id: 'block-1'});
    const doc = schema.node('doc', null, [block]);
    let state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 1),
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
            splitBlock: () => {
                const activeBlock = getActiveScriptBlockFromState(state);

                if (!activeBlock) {
                    return false;
                }

                const insertPos = activeBlock.pos + activeBlock.node.nodeSize;
                const nextBlock = activeBlock.node.type.create({
                    ...activeBlock.node.attrs,
                    id: 'block-2',
                });
                let tr = state.tr.insert(insertPos, nextBlock);

                tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
                state = state.apply(tr);

                return true;
            },
        },
    } as unknown as TiptapEditor;

    return editor;
};

const getBlockTypes = (editor: TiptapEditor) => {
    const blockTypes: string[] = [];

    editor.state.doc.forEach(node => {
        blockTypes.push(node.type.name);
    });

    return blockTypes;
};

describe('handleEnter', () => {
    it.each(DIALOGUE_LIKE_BLOCK_TYPES)(
        'creates another empty %s block on Shift+Enter',
        blockType => {
            const editor = createEditor(blockType);
            const event = createEnterEvent(true);

            expect(handleEnter(editor, event)).toBe(true);
            expect(event.wasPrevented()).toBe(true);
            expect(getBlockTypes(editor)).toEqual([blockType, blockType]);
            expect(editor.state.selection.$from.parent.type.name).toBe(blockType);
        },
    );

    it.each(DIALOGUE_LIKE_BLOCK_TYPES)(
        'keeps converting an empty %s block to character on Enter',
        blockType => {
            const editor = createEditor(blockType);
            const event = createEnterEvent();

            expect(handleEnter(editor, event)).toBe(true);
            expect(event.wasPrevented()).toBe(true);
            expect(getBlockTypes(editor)).toEqual(['character']);
        },
    );
});
