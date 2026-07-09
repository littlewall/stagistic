import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
    CUE_OUT_NODE_NAME,
    CUE_START_NODE_NAME,
} from '@stagistic/script';
import {type Node as ProseMirrorNode, Schema} from '@tiptap/pm/model';
import {EditorState, TextSelection} from '@tiptap/pm/state';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    describe, expect, it,
} from 'vite-plus/test';

import type {BlockNodeType} from '../scriptCore';
import {getActiveScriptBlockFromState} from '../scriptCore';
import {setBlockTypeWithSelection, updateBlockType} from './commands';

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
        doc: {content: '(character | stageDirection | dialogue)+'},
        text: {group: 'inline'},
        [CUE_START_NODE_NAME]: {
            group: 'inline',
            inline: true,
            atom: true,
            attrs: {title: {default: ''}},
        },
        [CUE_OUT_NODE_NAME]: {
            group: 'inline', inline: true, atom: true,
        },
        character: createBlockSpec('character'),
        stageDirection: createBlockSpec('stageDirection'),
        dialogue: createBlockSpec('dialogue'),
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

describe('updateBlockType', () => {
    it('normalizes a legacy + delimiter to / when converting a block to a character cue', () => {
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

    it('turns character pills and cue atoms into plain text when leaving a stage direction', () => {
        const characterTag = schema.marks[CHARACTER_TAG_MARK_NAME].create({
            [CHARACTER_TAG_KEY_ATTR]: 'ANNA',
            [CHARACTER_TAG_ID_ATTR]: 'character-1',
        });
        const content = [
            schema.text('ANNA', [characterTag]),
            schema.text(' enters'),
            schema.node(CUE_START_NODE_NAME, {title: 'Lights'}),
            schema.text('then '),
            schema.node(CUE_OUT_NODE_NAME),
        ];
        const {editor, getBlock} = createEditor('stageDirection', '', content, {
            ANNA: 'character-1',
        });

        expect(updateBlockType(editor, 'dialogue')).toBe(true);
        expect(getBlock()?.textContent).toBe('ANNA enters Lights then out');
        expect(getBlock()?.attrs.characterRefs).toBeNull();
        expect(getBlock()?.child(0).marks).toEqual([]);
        expect(getBlock()?.content.content.every(node => node.isText)).toBe(true);
    });

    it('normalizes stage-direction content through the selection-preserving type change', () => {
        const content = [schema.node(CUE_START_NODE_NAME, {title: 'Sound'})];
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
