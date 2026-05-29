import {ELEMENT_ACT, ELEMENT_SCENE_HEADING} from '@stagistic/script';

import type {ExtractedBlockRow} from '../../rewrite/jsonToBlocks';

export interface ExtractedBlocksDiff {
    inserted: ExtractedBlockRow[],
    updated: ExtractedBlockRow[],
    deletedIds: string[],
    /** true when block-id set, order, or any block's boundary-ness/heading changed */
    structural: boolean,
}

const isBoundary = (blockType: string): boolean => {
    return blockType === ELEMENT_SCENE_HEADING || blockType === ELEMENT_ACT;
};

const serializeRefs = (refByKey: Record<string, string>): string => {
    return Object.entries(refByKey)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, id]) => `${key}:${id}`)
        .join('|');
};

const rowsEqual = (a: ExtractedBlockRow, b: ExtractedBlockRow): boolean => {
    return a.blockType === b.blockType
        && a.orderNo === b.orderNo
        && a.textContent === b.textContent
        && a.contentJson === b.contentJson
        && a.sceneHeadingBlockId === b.sceneHeadingBlockId
        && a.actHeadingBlockId === b.actHeadingBlockId
        && a.columnGroupId === b.columnGroupId
        && a.columnIndex === b.columnIndex
        && serializeRefs(a.characterRefByKey) === serializeRefs(b.characterRefByKey);
};

export const diffExtractedBlocks = (
    previous: ExtractedBlockRow[],
    next: ExtractedBlockRow[],
): ExtractedBlocksDiff => {
    const prevById = new Map(previous.map(row => [row.blockId, row] as const));
    const nextById = new Map(next.map(row => [row.blockId, row] as const));

    const inserted: ExtractedBlockRow[] = [];
    const updated: ExtractedBlockRow[] = [];
    const deletedIds: string[] = [];
    let structural = false;

    next.forEach(row => {
        const prev = prevById.get(row.blockId);

        if (!prev) {
            inserted.push(row);
            structural = true;

            return;
        }

        if (rowsEqual(prev, row)) {
            return;
        }

        updated.push(row);

        /*
         * Structural when order changed, boundary-ness toggled, OR the block is
         * (or was) a boundary heading — a heading edit must reconcile the
         * scene/act rows (e.g. act rename updates scriptActs.name).
         */
        if (
            prev.orderNo !== row.orderNo
            || isBoundary(prev.blockType)
            || isBoundary(row.blockType)
        ) {
            structural = true;
        }
    });

    previous.forEach(row => {
        if (!nextById.has(row.blockId)) {
            deletedIds.push(row.blockId);
            structural = true;
        }
    });

    return {
        inserted, updated, deletedIds, structural,
    };
};
