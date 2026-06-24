import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
} from '../characters/characterTagMarks';
import type {ScriptDocument, ScriptNode} from '../document';
import {buildScriptBlockIndex} from './scriptBlockIndex';

const block = (type: string, id: string, text: string): ScriptNode => ({
    type,
    attrs: {id},
    content: text ? [{type: 'text', text}] : [],
});

const doc = (content: ScriptNode[]): ScriptDocument => ({type: 'doc', content});

describe('buildScriptBlockIndex', () => {
    it('returns an empty snapshot for nullish or empty documents', () => {
        const empty = {snapshot: {blocks: [], cues: []}, blockCount: 0};

        expect(buildScriptBlockIndex(null)).toEqual(empty);
        expect(buildScriptBlockIndex(undefined)).toEqual(empty);
        expect(buildScriptBlockIndex(doc([]))).toEqual(empty);
    });

    it('assigns sequential order numbers and tracks the current act and scene', () => {
        const {snapshot, blockCount} = buildScriptBlockIndex(doc([
            block('act', 'a1', 'ACT ONE'),
            block('scene', 's1', 'Scene 1'),
            block('dialogue', 'd1', 'Hello'),
        ]));

        expect(blockCount).toBe(3);
        expect(snapshot.blocks.map(b => b.orderNo)).toEqual([
            0,
            1,
            2,
        ]);
        expect(snapshot.blocks[0]).toMatchObject({
            blockId: 'a1', blockType: 'act', actBlockId: 'a1', sceneBlockId: null,
        });
        expect(snapshot.blocks[1]).toMatchObject({
            blockId: 's1', actBlockId: 'a1', sceneBlockId: 's1',
        });
        expect(snapshot.blocks[2]).toMatchObject({
            blockId: 'd1', actBlockId: 'a1', sceneBlockId: 's1',
        });
    });

    it('descends into non-block wrapper nodes', () => {
        const {snapshot} = buildScriptBlockIndex(doc([{type: 'wrapper', content: [block('scene', 's1', 'X')]}]));

        expect(snapshot.blocks).toHaveLength(1);
        expect(snapshot.blocks[0].blockId).toBe('s1');
    });

    it('treats block nodes as leaves and does not index nested blocks', () => {
        const {snapshot} = buildScriptBlockIndex(doc([
            {
                type: 'scene',
                attrs: {id: 's1'},
                content: [block('dialogue', 'd1', 'inner')],
            },
        ]));

        expect(snapshot.blocks).toHaveLength(1);
        expect(snapshot.blocks[0].blockType).toBe('scene');
    });

    it('synthesizes a fallback id for blocks without one', () => {
        const {snapshot} = buildScriptBlockIndex(doc([
            {
                type: 'scene', attrs: {}, content: [{type: 'text', text: 'x'}],
            },
        ]));

        expect(snapshot.blocks[0].blockId).toBe('missing-block-1');
    });

    it('trims the block text content', () => {
        const {snapshot} = buildScriptBlockIndex(doc([block('dialogue', 'd1', '  hi  ')]));

        expect(snapshot.blocks[0].textContent).toBe('hi');
    });

    it('returns null character refs for blocks that cannot hold them', () => {
        const {snapshot} = buildScriptBlockIndex(doc([block('dialogue', 'd1', 'Hello')]));

        expect(snapshot.blocks[0].characterRefs).toBeNull();
    });

    it('derives character-block refs from the characterRefs attribute', () => {
        const {snapshot} = buildScriptBlockIndex(doc([
            {
                type: 'character', attrs: {id: 'c1', characterRefs: {ANNA: 'char-1'}}, content: [],
            },
        ]));

        expect(snapshot.blocks[0].characterRefs).toEqual([{key: 'ANNA', characterId: 'char-1'}]);
    });

    it('derives stage-direction refs from inline character tag marks', () => {
        const {snapshot} = buildScriptBlockIndex(doc([
            {
                type: 'stageDirection',
                attrs: {id: 'sd1'},
                content: [
                    {
                        type: 'text',
                        text: 'Anna',
                        marks: [
                            {
                                type: CHARACTER_TAG_MARK_NAME,
                                attrs: {
                                    [CHARACTER_TAG_KEY_ATTR]: 'ANNA',
                                    [CHARACTER_TAG_ID_ATTR]: 'char-anna',
                                },
                            },
                        ],
                    },
                ],
            },
        ]));

        expect(snapshot.blocks[0].characterRefs).toEqual([{key: 'ANNA', characterId: 'char-anna'}]);
    });

    it('projects cues from stage-direction cue atoms', () => {
        const {snapshot} = buildScriptBlockIndex(doc([
            {
                type: 'stageDirection',
                attrs: {id: 'b1'},
                content: [
                    {type: 'text', text: 'Lights fade.'}, {
                        type: 'cueStart',
                        attrs: {
                            cueId: 'c1', mode: 'open', title: 'Night', kind: null,
                        },
                    },
                ],
            }, {
                type: 'stageDirection', attrs: {id: 'b2'}, content: [{type: 'cueOut'}],
            },
        ]));

        expect(snapshot.cues).toEqual([
            {
                cueId: 'c1', number: 1, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: 'b2',
            },
        ]);
    });
});
