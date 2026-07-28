import {
    describe, expect, it,
} from 'vite-plus/test';

import type {ExtractedBlockRow} from '../../blocks';
import {diffExtractedBlocks} from './diffExtractedBlocks';

const block = (over: Partial<ExtractedBlockRow> & {blockId: string, orderNo: number}): ExtractedBlockRow => ({
    blockType: 'stage_direction',
    textContent: '',
    contentJson: null,
    sceneHeadingBlockId: null,
    actHeadingBlockId: null,
    characterRefByKey: {},
    ...over,
});

describe('diffExtractedBlocks', () => {
    it('detects a pure text change as a non-structural update', () => {
        const prev = [
            block({
                blockId: 'a', orderNo: 0, textContent: 'hi',
            }),
        ];
        const next = [
            block({
                blockId: 'a', orderNo: 0, textContent: 'hello',
            }),
        ];

        const result = diffExtractedBlocks(prev, next);

        expect(result.structural).toBe(false);
        expect(result.updated.map(b => b.blockId)).toEqual(['a']);
        expect(result.inserted).toEqual([]);
        expect(result.deletedIds).toEqual([]);
    });

    it('flags insert as structural', () => {
        const prev = [block({blockId: 'a', orderNo: 0})];
        const next = [block({blockId: 'a', orderNo: 0}), block({blockId: 'b', orderNo: 1})];

        const result = diffExtractedBlocks(prev, next);

        expect(result.structural).toBe(true);
        expect(result.inserted.map(b => b.blockId)).toEqual(['b']);
    });

    it('flags delete as structural', () => {
        const prev = [block({blockId: 'a', orderNo: 0}), block({blockId: 'b', orderNo: 1})];
        const next = [block({blockId: 'a', orderNo: 0})];

        const result = diffExtractedBlocks(prev, next);

        expect(result.structural).toBe(true);
        expect(result.deletedIds).toEqual(['b']);
    });

    it('flags reorder (order change) as structural', () => {
        const prev = [block({blockId: 'a', orderNo: 0}), block({blockId: 'b', orderNo: 1})];
        const next = [block({blockId: 'b', orderNo: 0}), block({blockId: 'a', orderNo: 1})];

        const result = diffExtractedBlocks(prev, next);

        expect(result.structural).toBe(true);
    });

    it('flags boundary-ness change (stage direction -> scene heading) as structural', () => {
        const prev = [
            block({
                blockId: 'a', orderNo: 0, blockType: 'stage_direction',
            }),
        ];
        const next = [
            block({
                blockId: 'a', orderNo: 0, blockType: 'scene',
            }),
        ];

        const result = diffExtractedBlocks(prev, next);

        expect(result.structural).toBe(true);
        expect(result.updated.map(b => b.blockId)).toEqual(['a']);
    });

    it('flags a text edit of an existing act heading as structural (act-row name must reconcile)', () => {
        const prev = [
            block({
                blockId: 'h', orderNo: 0, blockType: 'act', textContent: 'ACT ONE',
            }),
        ];
        const next = [
            block({
                blockId: 'h', orderNo: 0, blockType: 'act', textContent: 'ACT TWO',
            }),
        ];

        const result = diffExtractedBlocks(prev, next);

        expect(result.structural).toBe(true);
        expect(result.updated.map(b => b.blockId)).toEqual(['h']);
    });

    it('returns no changes for identical input', () => {
        const prev = [
            block({
                blockId: 'a', orderNo: 0, textContent: 'x',
            }),
        ];
        const next = [
            block({
                blockId: 'a', orderNo: 0, textContent: 'x',
            }),
        ];

        const result = diffExtractedBlocks(prev, next);

        expect(result.structural).toBe(false);
        expect(result.updated).toEqual([]);
        expect(result.inserted).toEqual([]);
        expect(result.deletedIds).toEqual([]);
    });
});
