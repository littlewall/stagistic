import type {ScriptBlock} from '@stagistic/db';
import type {
    IndexedScriptBlock,
    IndexedScriptCharacterRef,
    ScriptBlockIndexSnapshot,
} from '@stagistic/script-core';

import {toScriptBlockRowFromIndexedBlock} from './snapshot';
import type {
    BlockDiffPath,
    BlockDiffResult,
    ScriptBlockChange,
} from './types';

interface ResolveScriptBlockDiffArgs {
    scriptId: string,
    previousSnapshot: ScriptBlockIndexSnapshot,
    nextSnapshot: ScriptBlockIndexSnapshot,
    previousBlocksById?: ReadonlyMap<string, ScriptBlock>,
    now?: number,
}

const toComparableCharacterRefs = (refs: IndexedScriptCharacterRef[] | null): string => {
    if (!Array.isArray(refs) || refs.length === 0) {
        return '';
    }

    return refs
        .map(ref => `${ref.key}:${ref.characterId ?? ''}`)
        .sort((left, right) => left.localeCompare(right))
        .join('|');
};

const areIndexedBlocksEqual = (previous: IndexedScriptBlock, next: IndexedScriptBlock): boolean => {
    return previous.blockType === next.blockType
        && previous.orderNo === next.orderNo
        && previous.textContent === next.textContent
        && previous.sceneBlockId === next.sceneBlockId
        && previous.actBlockId === next.actBlockId
        && previous.columnGroupOrder === next.columnGroupOrder
        && previous.columnOrder === next.columnOrder
        && toComparableCharacterRefs(previous.characterRefs) === toComparableCharacterRefs(next.characterRefs);
};

const isFastTextChange = (
    previous: IndexedScriptBlock,
    next: IndexedScriptBlock,
): boolean => {
    if (previous.blockId !== next.blockId) {
        return false;
    }

    return previous.blockType === next.blockType
        && previous.orderNo === next.orderNo
        && previous.sceneBlockId === next.sceneBlockId
        && previous.actBlockId === next.actBlockId
        && previous.columnGroupOrder === next.columnGroupOrder
        && previous.columnOrder === next.columnOrder
        && (
            previous.textContent !== next.textContent
            || toComparableCharacterRefs(previous.characterRefs) !== toComparableCharacterRefs(next.characterRefs)
        );
};

const classifyDiffPath = (
    changes: ScriptBlockChange[],
    previousSnapshot: ScriptBlockIndexSnapshot,
    nextSnapshot: ScriptBlockIndexSnapshot,
): BlockDiffPath => {
    if (changes.length === 0) {
        return 'fast';
    }

    if (
        changes.length === 1
        && changes[0].type === 'update'
        && previousSnapshot.blocks.length === nextSnapshot.blocks.length
    ) {
        const previous = previousSnapshot.blocks.find(block => block.blockId === changes[0].blockId);
        const next = nextSnapshot.blocks.find(block => block.blockId === changes[0].blockId);

        if (previous && next && isFastTextChange(previous, next)) {
            return 'fast';
        }
    }

    if (changes.length <= 4) {
        return 'medium';
    }

    return 'full';
};

export const resolveScriptBlockDiff = ({
    scriptId,
    previousSnapshot,
    nextSnapshot,
    previousBlocksById,
    now: explicitNow,
}: ResolveScriptBlockDiffArgs): BlockDiffResult => {
    const now = explicitNow ?? Date.now();
    const previousById = new Map(previousSnapshot.blocks.map(block => [block.blockId, block] as const));
    const nextById = new Map(nextSnapshot.blocks.map(block => [block.blockId, block] as const));
    const changes: ScriptBlockChange[] = [];

    nextSnapshot.blocks.forEach(block => {
        const previous = previousById.get(block.blockId);

        if (!previous) {
            changes.push({
                type: 'insert',
                blockId: block.blockId,
                data: {
                    block: toScriptBlockRowFromIndexedBlock(
                        scriptId,
                        block,
                        now,
                        previousBlocksById,
                    ),
                    characterRefs: block.characterRefs,
                },
            });

            return;
        }

        if (!areIndexedBlocksEqual(previous, block)) {
            changes.push({
                type: 'update',
                blockId: block.blockId,
                data: {
                    block: toScriptBlockRowFromIndexedBlock(
                        scriptId,
                        block,
                        now,
                        previousBlocksById,
                    ),
                    characterRefs: block.characterRefs,
                },
            });
        }
    });

    previousSnapshot.blocks.forEach(block => {
        if (nextById.has(block.blockId)) {
            return;
        }

        changes.push({
            type: 'delete',
            blockId: block.blockId,
        });
    });

    return {
        path: classifyDiffPath(changes, previousSnapshot, nextSnapshot),
        changes,
        nextSnapshot,
    };
};
