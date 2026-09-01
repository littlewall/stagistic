import {splitBlock} from '@tiptap/pm/commands';
import {type Node as ProseMirrorNode, Schema} from '@tiptap/pm/model';
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

/*
 * Block node order matters and must follow ALL_BLOCK_BINDINGS: ProseMirror's
 * splitBlock falls back to the first textblock in the doc's content match
 * (defaultBlockAt), so scene has to come first here exactly as it does in the
 * real schema - otherwise these tests can't reproduce a default-type leak.
 */
const schema = new Schema({
    nodes: {
        doc: {content: 'block+'},
        text: {group: 'inline'},
        scene: createBlockSpec('scene'),
        act: createBlockSpec('act'),
        character: createBlockSpec('character'),
        aside: createBlockSpec('aside'),
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

const createEditor = (
    blockType: BlockNodeType,
    text = '',
    cursorOffset = 0,
    blockId = 'block-1',
    onRequestConvertScene: (blockId: string, blockType: BlockNodeType) => void = () => {},
) => {
    const block = schema.node(blockType, {blockType, id: blockId}, text ? [schema.text(text)] : undefined);
    const doc = schema.node('doc', null, [block]);
    let state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 1 + cursorOffset),
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
            requestConvertScene: onRequestConvertScene,
            deleteSelection: () => {
                state = state.apply(state.tr.deleteSelection());

                return true;
            },
            /*
             * The real prosemirror-commands splitBlock, not a hand-rolled
             * tr.split: its default-block-type substitution is exactly the
             * behaviour these tests need to exercise.
             */
            splitBlock: () => splitBlock(state, tr => {
                state = state.apply(tr);
            }),
        },
    } as unknown as TiptapEditor;

    return editor;
};

/*
 * Some Enter decisions (an aside resuming the flow it interrupted) can only be
 * made by looking at the blocks around the caret, so those cases need a real
 * multi-block document. The caret starts at the end of the last block.
 */
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

    return {
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
            deleteSelection: () => {
                state = state.apply(state.tr.deleteSelection());

                return true;
            },
            splitBlock: () => splitBlock(state, tr => {
                state = state.apply(tr);
            }),
        },
    } as unknown as TiptapEditor;
};

const getBlockTypes = (editor: TiptapEditor) => {
    const blockTypes: string[] = [];

    editor.state.doc.forEach(node => {
        blockTypes.push(node.type.name);
    });

    return blockTypes;
};

const getBlocks = (editor: TiptapEditor) => {
    const blocks: ProseMirrorNode[] = [];

    editor.state.doc.forEach(node => {
        blocks.push(node);
    });

    return blocks;
};

const getBlockTexts = (editor: TiptapEditor) => {
    const blockTexts: string[] = [];

    editor.state.doc.forEach(node => {
        blockTexts.push(node.textContent);
    });

    return blockTexts;
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

    it.each(DIALOGUE_LIKE_BLOCK_TYPES)(
        'splitting mid-text keeps the %s type even when a different next type is configured',
        blockType => {
            const editor = createEditor(blockType, 'Hello there', 5);
            const event = createEnterEvent();

            expect(handleEnter(editor, event, {[blockType]: 'aside'})).toBe(true);
            expect(event.wasPrevented()).toBe(true);
            expect(getBlockTypes(editor)).toEqual([blockType, blockType]);
            expect(getBlockTexts(editor)).toEqual(['Hello', ' there']);
        },
    );

    it.each(DIALOGUE_LIKE_BLOCK_TYPES)(
        'splitting from the end of a non-empty %s block applies the configured next type',
        blockType => {
            const editor = createEditor(blockType, 'Hello', 5);
            const event = createEnterEvent();

            expect(handleEnter(editor, event, {[blockType]: 'aside'})).toBe(true);
            expect(event.wasPrevented()).toBe(true);
            expect(getBlockTypes(editor)).toEqual([blockType, 'aside']);
        },
    );

    it('does not request scene conversion while creating the configured next block', () => {
        const conversionRequests: Array<{blockId: string, blockType: BlockNodeType}> = [];
        const editor = createEditor('dialogue', 'Hello', 5, 'dialogue-1', (blockId, blockType) => {
            conversionRequests.push({blockId, blockType});
        });

        expect(handleEnter(editor, createEnterEvent(), {dialogue: 'aside'})).toBe(true);
        expect(conversionRequests).toEqual([]);
        expect(getBlockTypes(editor)).toEqual(['dialogue', 'aside']);
    });

    it('keeps producing lyrics when Enter is pressed again at the start of a freshly split lyrics block', () => {
        // Split "Sing|this song" mid-text, which parks the caret at the start
        // of the new block, then press Enter again from exactly there.
        const editor = createEditor('lyrics', 'Sing this song', 4);

        expect(handleEnter(editor, createEnterEvent())).toBe(true);
        expect(getBlockTypes(editor)).toEqual(['lyrics', 'lyrics']);
        expect(getBlockTexts(editor)).toEqual(['Sing', ' this song']);

        expect(handleEnter(editor, createEnterEvent())).toBe(true);
        expect(getBlockTypes(editor)).toEqual(['lyrics', 'lyrics', 'lyrics']);
        expect(getBlockTexts(editor)).toEqual(['Sing', '', ' this song']);
    });

    it.each(DIALOGUE_LIKE_BLOCK_TYPES)(
        'inserts an empty %s block rather than the schema default when Enter fires at the block start',
        blockType => {
            const editor = createEditor(blockType, 'Sing this song', 0);

            expect(handleEnter(editor, createEnterEvent())).toBe(true);
            expect(getBlockTypes(editor)).toEqual([blockType, blockType]);
            expect(getBlockTexts(editor)).toEqual(['', 'Sing this song']);
        },
    );

    it('leaves the caret on the text and keeps its block id when Enter fires at the block start', () => {
        const editor = createEditor('lyrics', 'Sing this song', 0, 'original-id');

        expect(handleEnter(editor, createEnterEvent())).toBe(true);

        const [insertedBlock, textBlock] = getBlocks(editor);

        expect(textBlock.textContent).toBe('Sing this song');
        expect(textBlock.attrs.id).toBe('original-id');
        expect(insertedBlock.attrs.id).not.toBe('original-id');
        expect(editor.state.selection.$from.parent.textContent).toBe('Sing this song');
    });

    /*
     * isScriptBlockContentEmpty trims, so a whitespace-only block counts as
     * empty and keeps taking the "empty dialogue/lyrics means the writer is
     * done talking" route, ahead of any split. Pinned because it is easy to
     * mistake for a split case when reading handleEnter top to bottom.
     */
    it('treats a whitespace-only lyrics block as empty and converts it to character', () => {
        const editor = createEditor('lyrics', '  ', 2);

        expect(handleEnter(editor, createEnterEvent(), {lyrics: 'scene'})).toBe(true);
        expect(getBlockTypes(editor)).toEqual(['character']);
    });

    it('resumes lyrics when Enter fires at the end of an aside that interrupted a song', () => {
        const editor = createMultiBlockEditor([
            {blockType: 'lyrics', text: 'La la la'},
            {blockType: 'aside', text: 'quietly'},
        ]);

        expect(handleEnter(editor, createEnterEvent(), {aside: 'dialogue'})).toBe(true);
        expect(getBlockTypes(editor)).toEqual(['lyrics', 'aside', 'lyrics']);
    });

    it('skips a run of asides when working out which flow to resume', () => {
        const editor = createMultiBlockEditor([
            {blockType: 'lyrics', text: 'La la la'},
            {blockType: 'aside', text: 'first'},
            {blockType: 'aside', text: 'second'},
        ]);

        expect(handleEnter(editor, createEnterEvent(), {aside: 'dialogue'})).toBe(true);
        expect(getBlockTypes(editor)).toEqual(['lyrics', 'aside', 'aside', 'lyrics']);
    });

    it('keeps the configured next type for an aside that interrupted spoken dialogue', () => {
        const editor = createMultiBlockEditor([
            {blockType: 'dialogue', text: 'Hello there'},
            {blockType: 'aside', text: 'quietly'},
        ]);

        expect(handleEnter(editor, createEnterEvent(), {aside: 'character'})).toBe(true);
        expect(getBlockTypes(editor)).toEqual(['dialogue', 'aside', 'character']);
    });

    it('keeps the aside type when Enter splits it mid-text', () => {
        const editor = createMultiBlockEditor([
            {blockType: 'lyrics', text: 'La la la'},
            {blockType: 'aside', text: 'quietly'},
        ]);

        // Four characters back from the end of "quietly", i.e. "qui|etly".
        editor.view.dispatch(editor.state.tr.setSelection(
            TextSelection.create(editor.state.doc, editor.state.doc.content.size - 5),
        ));

        expect(handleEnter(editor, createEnterEvent())).toBe(true);
        expect(getBlockTypes(editor)).toEqual(['lyrics', 'aside', 'aside']);
        expect(getBlockTexts(editor)).toEqual(['La la la', 'qui', 'etly']);
    });

    it('splitting mid-text on act keeps the act type instead of jumping to scene', () => {
        const editor = createEditor('act', 'ACT ONE', 3);
        const event = createEnterEvent();

        expect(handleEnter(editor, event)).toBe(true);
        expect(event.wasPrevented()).toBe(true);
        expect(getBlockTypes(editor)).toEqual(['act', 'act']);
        expect(getBlockTexts(editor)).toEqual(['ACT', ' ONE']);
    });

    it('splitting from the end of a non-empty character block applies the configured next type', () => {
        const editor = createEditor('character', 'HAMLET', 6);
        const event = createEnterEvent();

        expect(handleEnter(editor, event)).toBe(true);
        expect(event.wasPrevented()).toBe(true);
        expect(getBlockTypes(editor)).toEqual(['character', 'dialogue']);
    });

    it('splitting mid-text on character keeps the character type', () => {
        const editor = createEditor('character', 'HAMLET', 3);
        const event = createEnterEvent();

        expect(handleEnter(editor, event)).toBe(true);
        expect(event.wasPrevented()).toBe(true);
        expect(getBlockTypes(editor)).toEqual(['character', 'character']);
        expect(getBlockTexts(editor)).toEqual(['HAM', 'LET']);
    });
});
