import type {ExtractedBlockRow} from '../../blocks';
import {generateBlockOrderKeys} from '../../queries';
import {computeOrderKeyAssignments} from './minimalOrderKeys';

/*
 * Fractional-indexing strategy: keys are lexicographic strings from the
 * `fractional-indexing` library. On a structural save we re-key minimally —
 * blocks on the longest increasing subsequence of baseline keys keep them,
 * only moved/inserted blocks get fresh keys between the stable anchors. Full
 * re-key (evenly spaced keys for all blocks) is the fallback when no usable
 * baseline exists, which also bounds key-length growth over time.
 * The unique constraint on (script_id, block_order) was intentionally removed
 * by migrations 0004/0005: PostgreSQL checks uniqueness row-by-row inside a
 * single UPDATE, so swapping keys between two blocks always triggers a
 * spurious violation before both rows are committed.
 */
export const assignOrderKeys = (
    blocks: readonly ExtractedBlockRow[],
    baselineOrderKeys: Map<string, string>,
): {orderKeyById: Map<string, string>, changedOrders: {id: string, blockOrder: string}[]} => {
    const minimal = computeOrderKeyAssignments(
        blocks.map(block => block.blockId),
        baselineOrderKeys,
    );

    if (minimal) {
        return {orderKeyById: minimal.keyById, changedOrders: minimal.changed};
    }

    const fullKeys = generateBlockOrderKeys(blocks.length);

    return {
        orderKeyById: new Map(blocks.map(block => [block.blockId, fullKeys[block.orderNo]])),
        changedOrders: blocks.map(block => ({id: block.blockId, blockOrder: fullKeys[block.orderNo]})),
    };
};
