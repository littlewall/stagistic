import {type BlockOrderAssignment, generateBlockOrdersBetween} from '../../queries';

export interface OrderKeyAssignments {
    keyById: Map<string, string>,
    changed: BlockOrderAssignment[],
}

const findKeptIndexes = (keys: (string | null)[]): Set<number> => {
    const tails: number[] = [];
    const predecessor = new Map<number, number>();

    keys.forEach((key, index) => {
        if (key === null) {
            return;
        }

        let low = 0;
        let high = tails.length;

        while (low < high) {
            const mid = (low + high) >> 1;

            if ((keys[tails[mid]] as string) < key) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        if (low > 0) {
            predecessor.set(index, tails[low - 1]);
        }

        tails[low] = index;
    });

    const kept = new Set<number>();
    let cursor = tails.length > 0 ? tails[tails.length - 1] : undefined;

    while (cursor !== undefined) {
        kept.add(cursor);
        cursor = predecessor.get(cursor);
    }

    return kept;
};

/**
 * Compute minimal block-order reassignments for the new document order.
 * Returns null when a minimal assignment is not possible (empty/duplicate
 * baseline, fractional-indexing precision exhausted) — the caller falls
 * back to a full re-key.
 */
export const computeOrderKeyAssignments = (
    orderedBlockIds: string[],
    baselineKeyById: ReadonlyMap<string, string>,
): OrderKeyAssignments | null => {
    if (baselineKeyById.size === 0) {
        return null;
    }

    const existingKeys: (string | null)[] = [];
    const seenKeys = new Set<string>();

    for (const blockId of orderedBlockIds) {
        const key = baselineKeyById.get(blockId) ?? null;

        if (key !== null) {
            if (seenKeys.has(key)) {
                return null;
            }

            seenKeys.add(key);
        }

        existingKeys.push(key);
    }

    const keptIndexes = findKeptIndexes(existingKeys);
    const keyById = new Map<string, string>();
    const changed: BlockOrderAssignment[] = [];

    try {
        let runStart = 0;

        for (let index = 0; index <= orderedBlockIds.length; index += 1) {
            const isAnchor = index === orderedBlockIds.length || keptIndexes.has(index);

            if (!isAnchor) {
                continue;
            }

            if (runStart < index) {
                const beforeKey = runStart > 0 ? (existingKeys[runStart - 1] as string) : null;
                const afterKey = index < orderedBlockIds.length ? (existingKeys[index] as string) : null;
                const freshKeys = generateBlockOrdersBetween(beforeKey, afterKey, index - runStart);

                for (let offset = 0; offset < freshKeys.length; offset += 1) {
                    const blockId = orderedBlockIds[runStart + offset];

                    keyById.set(blockId, freshKeys[offset]);
                    changed.push({id: blockId, blockOrder: freshKeys[offset]});
                }
            }

            if (index < orderedBlockIds.length) {
                keyById.set(orderedBlockIds[index], existingKeys[index] as string);
            }

            runStart = index + 1;
        }
    } catch {
        return null;
    }

    return {keyById, changed};
};
