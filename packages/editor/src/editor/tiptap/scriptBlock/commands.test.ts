import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
} from '@stagistic/script';
import {type Node as ProseMirrorNode, Schema} from '@tiptap/pm/model';
import {EditorState, TextSelection} from '@tiptap/pm/state';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    describe, expect, it,
} from 'vite-plus/test';

import type {BlockNodeType} from '../scriptCore';
import {getActiveScriptBlockFromState} from '../scriptCore';
import {
    setBlockTypeWithSelection,
    updateBlockType,
    updateBlockTypeForSelection,
} from './commands';

const createBlockSpec = (blockType: BlockNodeType) => ({
    group: 'block',
    content: 'inline*',
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
        doc: {content: '(character | stageDirection | dialogue | lyrics | aside | act)+'},
        text: {group: 'inline'},
        [MUSIC_START_NODE_NAME]: {
            group: 'inline',
            inline: true,
            atom: true,
            attrs: {title: {default: ''}},
        },
        [MUSIC_OUT_NODE_NAME]: {
            group: 'inline', inline: true, atom: true,
        },
        character: createBlockSpec('character'),
        stageDirection: createBlockSpec('stageDirection'),
        dialogue: createBlockSpec('dialogue'),
        lyrics: createBlockSpec('lyrics'),
        aside: createBlockSpec('aside'),
        act: createBlockSpec('act'),
    },
    marks: {
        [CHARACTER_TAG_MARK_NAME]: {
            attrs: {
                [CHARACTER_TAG_KEY_ATTR]: {default: ''},
                [CHARACTER_TAG_ID_ATTR]: {default: null},
            },
        },
    },
});

const createEditor = (
    blockType: BlockNodeType,
    text: string,
    content?: ProseMirrorNode[],
    characterRefs: Record<string, string> | null = null,
) => {
    const blockContent = content ?? (text ? [schema.text(text)] : undefined);
    const block = schema.node(
        blockType,
        {
            blockType,
            id: 'block-1',
            characterRefs,
        },
        blockContent,
    );
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

const createMultiBlockEditor = (
    blocks: Array<{blockType: BlockNodeType, text: string, id: string}>,
) => {
    const nodes = blocks.map(({blockType, text, id}) => schema.node(
        blockType,
        {
            blockType,
            id,
            characterRefs: null,
        },
        text ? [schema.text(text)] : undefined,
    ));
    const doc = schema.node('doc', null, nodes);
    const lastNode = nodes.at(-1);

    if (!lastNode) {
        throw new Error('Expected at least one block');
    }

    const to = doc.content.size - lastNode.nodeSize + 1;
    let state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 1, to),
    });
    let dispatchCount = 0;
    const editor = {
        get state() {
            return state;
        },
        schema,
        view: {
            focus: () => {},
            dispatch: (tr: EditorState['tr']) => {
                dispatchCount += 1;
                state = state.apply(tr);
            },
        },
        commands: {
            focus: () => true,
        },
    } as unknown as TiptapEditor;

    return {
        editor,
        getBlocks: () => {
            const result: ProseMirrorNode[] = [];

            state.doc.forEach(node => result.push(node));

            return result;
        },
        getDispatchCount: () => dispatchCount,
    };
};

describe('updateBlockType', () => {
    it('normalizes a legacy + delimiter to / when converting a block to a character music', () => {
        const {editor, getBlock} = createEditor('stageDirection', 'SALLY+ISABELLA');

        expect(updateBlockType(editor, 'character')).toBe(true);
        expect(getBlock()?.type.name).toBe('character');
        expect(getBlock()?.textContent).toBe('SALLY/ISABELLA');
    });

    it('leaves already-canonical character text untouched', () => {
        const {editor, getBlock} = createEditor('stageDirection', 'ANNA/PETER');

        expect(updateBlockType(editor, 'character')).toBe(true);
        expect(getBlock()?.textContent).toBe('ANNA/PETER');
    });

    it('does not touch text when converting to a non-character block type', () => {
        const {editor, getBlock} = createEditor('character', 'SALLY+ISABELLA');

        expect(updateBlockType(editor, 'stageDirection')).toBe(true);
        expect(getBlock()?.textContent).toBe('SALLY+ISABELLA');
    });

    it('turns a music start into plain text but preserves an out when leaving a stage direction', () => {
        const characterTag = schema.marks[CHARACTER_TAG_MARK_NAME].create({
            [CHARACTER_TAG_KEY_ATTR]: 'ANNA',
            [CHARACTER_TAG_ID_ATTR]: 'character-1',
        });
        const content = [
            schema.text('ANNA', [characterTag]),
            schema.text(' enters'),
            schema.node(MUSIC_START_NODE_NAME, {title: 'Lights'}),
            schema.text('then '),
            schema.node(MUSIC_OUT_NODE_NAME),
        ];
        const {editor, getBlock} = createEditor('stageDirection', '', content, {
            ANNA: 'character-1',
        });

        expect(updateBlockType(editor, 'dialogue')).toBe(true);
        expect(getBlock()?.textContent).toBe('ANNA enters Lights then ');
        expect(getBlock()?.attrs.characterRefs).toBeNull();
        expect(getBlock()?.child(0).marks).toEqual([]);
        expect(getBlock()?.content.content.at(-1)?.type.name).toBe(MUSIC_OUT_NODE_NAME);
    });

    it('normalizes stage-direction content through the selection-preserving type change', () => {
        const content = [schema.node(MUSIC_START_NODE_NAME, {title: 'Sound'})];
        const {editor, getBlock} = createEditor('stageDirection', '', content);
        const block = getActiveScriptBlockFromState(editor.state);

        if (!block) {
            throw new Error('Expected an active stage-direction block');
        }

        expect(setBlockTypeWithSelection(editor, block, 'dialogue')).toBe(true);
        expect(getBlock()?.textContent).toBe('Sound');
        expect(getBlock()?.firstChild?.isText).toBe(true);
    });
});

describe('setBlockTypeWithSelection converting to aside', () => {
    it('strips a single leading and trailing paren when the text is fully wrapped', () => {
        const {editor, getBlock} = createEditor('dialogue', '(quietly)');
        const block = getActiveScriptBlockFromState(editor.state);

        if (!block) {
            throw new Error('Expected an active dialogue block');
        }

        expect(setBlockTypeWithSelection(editor, block, 'aside')).toBe(true);
        expect(getBlock()?.type.name).toBe('aside');
        expect(getBlock()?.textContent).toBe('quietly');
    });

    it('leaves text untouched when it is not wrapped in a matching leading/trailing paren pair', () => {
        const {editor, getBlock} = createEditor('dialogue', '(quietly');
        const block = getActiveScriptBlockFromState(editor.state);

        if (!block) {
            throw new Error('Expected an active dialogue block');
        }

        expect(setBlockTypeWithSelection(editor, block, 'aside')).toBe(true);
        expect(getBlock()?.textContent).toBe('(quietly');
    });

    it('does not strip parens when converting to a non-aside type', () => {
        const {editor, getBlock} = createEditor('dialogue', '(quietly)');
        const block = getActiveScriptBlockFromState(editor.state);

        if (!block) {
            throw new Error('Expected an active dialogue block');
        }

        expect(setBlockTypeWithSelection(editor, block, 'lyrics')).toBe(true);
        expect(getBlock()?.textContent).toBe('(quietly)');
    });
});

describe('single-block type change restores cursor position', () => {
    it('keeps a collapsed cursor at the same offset after updateBlockType', () => {
        const {editor} = createEditor('dialogue', 'Hello there');
        const pos = 1 + 5;

        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos)));

        expect(updateBlockType(editor, 'lyrics')).toBe(true);
        expect(editor.state.selection.from).toBe(pos);
        expect(editor.state.selection.to).toBe(pos);
    });

    it('keeps a non-collapsed selection range after updateBlockType', () => {
        const {editor} = createEditor('dialogue', 'Hello there');
        const from = 1 + 2;
        const to = 1 + 7;

        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, from, to)));

        expect(updateBlockType(editor, 'lyrics')).toBe(true);
        expect(editor.state.selection.from).toBe(from);
        expect(editor.state.selection.to).toBe(to);
    });

    it('shifts the cursor left by the stripped leading tabs when converting a stage direction', () => {
        const {editor} = createEditor('stageDirection', '\t\tHello there');
        const pos = 1 + 5;

        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos)));

        expect(updateBlockType(editor, 'dialogue')).toBe(true);
        expect(editor.state.selection.from).toBe(pos - 2);
    });

    it('shifts the cursor left when converting to aside strips a leading paren', () => {
        const {editor} = createEditor('dialogue', '(quietly now)');
        const pos = 1 + 8;
        const block = getActiveScriptBlockFromState(editor.state);

        if (!block) {
            throw new Error('Expected an active dialogue block');
        }

        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos)));

        expect(setBlockTypeWithSelection(editor, block, 'aside')).toBe(true);
        expect(editor.state.selection.from).toBe(pos - 1);
    });
});

describe('updateBlockTypeForSelection', () => {
    it('changes the actual node type (not just the blockType attribute) for every block in the selection', () => {
        const {editor, getBlocks} = createMultiBlockEditor([
            {blockType: 'dialogue', text: 'Hello there', id: 'block-1'},
            {blockType: 'dialogue', text: 'General Kenobi', id: 'block-2'},
        ]);

        expect(updateBlockTypeForSelection(editor, 'lyrics')).toBe(true);

        const blocks = getBlocks();

        expect(blocks.map(block => block.type.name)).toEqual(['lyrics', 'lyrics']);
        expect(blocks.map(block => block.attrs.blockType)).toEqual(['lyrics', 'lyrics']);
        expect(blocks.map(block => block.textContent)).toEqual(['Hello there', 'General Kenobi']);
    });

    it('dispatches a single transaction so the bulk change is one undo step', () => {
        const {editor, getDispatchCount} = createMultiBlockEditor([
            {blockType: 'dialogue', text: 'Hello there', id: 'block-1'},
            {blockType: 'dialogue', text: 'General Kenobi', id: 'block-2'},
            {blockType: 'dialogue', text: 'You are a bold one', id: 'block-3'},
        ]);

        updateBlockTypeForSelection(editor, 'lyrics');

        expect(getDispatchCount()).toBe(1);
    });

    it('converts mixed dialogue and stage-direction blocks and resets characterRefs from a former stage direction', () => {
        const {editor, getBlocks} = createMultiBlockEditor([
            {blockType: 'dialogue', text: 'Hello there', id: 'block-1'},
            {blockType: 'stageDirection', text: '\tGeneral Kenobi', id: 'block-2'},
        ]);

        expect(updateBlockTypeForSelection(editor, 'lyrics')).toBe(true);

        const blocks = getBlocks();

        expect(blocks.map(block => block.type.name)).toEqual(['lyrics', 'lyrics']);
        // The leading action-indent tab from the former stage direction is stripped, same as a single-block change.
        expect(blocks[1].textContent).toBe('General Kenobi');
    });

    it('leaves blocks whose type is not eligible for bulk change (act) untouched', () => {
        const {editor, getBlocks} = createMultiBlockEditor([
            {blockType: 'act', text: 'ACT ONE', id: 'block-1'},
            {blockType: 'dialogue', text: 'Hello there', id: 'block-2'},
        ]);

        expect(updateBlockTypeForSelection(editor, 'lyrics')).toBe(true);

        const blocks = getBlocks();

        expect(blocks.map(block => block.type.name)).toEqual(['act', 'lyrics']);
    });

    it('strips wrapping parens from each block when bulk-converting to aside', () => {
        const {editor, getBlocks} = createMultiBlockEditor([
            {blockType: 'dialogue', text: '(quietly)', id: 'block-1'},
            {blockType: 'lyrics', text: 'La la la', id: 'block-2'},
        ]);

        expect(updateBlockTypeForSelection(editor, 'aside')).toBe(true);

        const blocks = getBlocks();

        expect(blocks.map(block => block.type.name)).toEqual(['aside', 'aside']);
        expect(blocks.map(block => block.textContent)).toEqual(['quietly', 'La la la']);
    });

    it('does nothing and returns false when no block in the selection can change', () => {
        const {editor, getBlocks, getDispatchCount} = createMultiBlockEditor([
            {blockType: 'lyrics', text: 'Hello there', id: 'block-1'},
        ]);

        expect(updateBlockTypeForSelection(editor, 'lyrics')).toBe(false);
        expect(getDispatchCount()).toBe(0);
        expect(getBlocks().map(block => block.type.name)).toEqual(['lyrics']);
    });
});
