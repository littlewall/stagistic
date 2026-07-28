import {
    describe, expect, it,
} from 'vite-plus/test';

import type {ScriptNode} from '../document';
import {collectStructureBlocks} from './collectStructureBlocks';

const block = (type: string, id: string | undefined, text: string): ScriptNode => ({
    type,
    attrs: id === undefined ? {} : {id},
    content: [{type: 'text', text}],
});

describe('collectStructureBlocks', () => {
    it('returns an empty list for undefined or empty input', () => {
        expect(collectStructureBlocks(undefined)).toEqual([]);
        expect(collectStructureBlocks([])).toEqual([]);
    });

    it('flattens block nodes with index, trimmed text, and ids', () => {
        const entries = collectStructureBlocks([
            block('act', 'a1', 'ACT ONE'),
            block('scene', 's1', '  Scene 1  '),
            block('dialogue', 'd1', 'Hello'),
        ]);

        expect(entries).toEqual([
            {
                id: 'a1', blockType: 'act', text: 'ACT ONE', index: 0, sceneIndex: -1,
            },
            {
                id: 's1', blockType: 'scene', text: 'Scene 1', index: 1, sceneIndex: 0,
            },
            {
                id: 'd1', blockType: 'dialogue', text: 'Hello', index: 2, sceneIndex: 0,
            },
        ]);
    });

    it('increments the scene index on each scene block', () => {
        const entries = collectStructureBlocks([
            block('scene', 's1', 'First'),
            block('dialogue', 'd1', 'a'),
            block('scene', 's2', 'Second'),
            block('dialogue', 'd2', 'b'),
        ]);

        expect(entries.map(e => e.sceneIndex)).toEqual([
            0,
            0,
            1,
            1,
        ]);
    });

    it('descends into non-block wrapper nodes', () => {
        const entries = collectStructureBlocks([{type: 'wrapper', content: [block('scene', 's1', 'Nested')]}]);

        expect(entries).toHaveLength(1);
        expect(entries[0].id).toBe('s1');
    });

    it('treats block nodes as leaves and does not descend into them', () => {
        const entries = collectStructureBlocks([
            {
                type: 'scene',
                attrs: {id: 's1'},
                content: [block('dialogue', 'd1', 'inner')],
            },
        ]);

        expect(entries).toHaveLength(1);
        expect(entries[0].blockType).toBe('scene');
    });

    it('yields an empty id for blocks without one', () => {
        const entries = collectStructureBlocks([block('scene', undefined, 'No id')]);

        expect(entries[0].id).toBe('');
    });

    it('concatenates nested text fragments', () => {
        const entries = collectStructureBlocks([
            {
                type: 'scene',
                attrs: {id: 's1'},
                content: [{type: 'text', text: 'INT. '}, {type: 'text', text: 'HOUSE'}],
            },
        ]);

        expect(entries[0].text).toBe('INT. HOUSE');
    });
});
