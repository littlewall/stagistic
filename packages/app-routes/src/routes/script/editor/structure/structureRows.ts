import {
    collectStructureBlocks,
    ELEMENT_ACT,
    ELEMENT_SCENE_HEADING,
    type FountainJSONContent,
    normalizeActName,
} from '@stagistic/script-core';

export type StructureActRow = {
    kind: 'act',
    blockId: string,
    name: string,
    index: number,
};

export type StructureSceneRow = {
    kind: 'scene',
    blockId: string,
    title: string,
    index: number,
};

export type StructureRow = StructureActRow | StructureSceneRow;

export type StructureRowsState = {
    rows: StructureRow[],
    rowByBlockId: Map<string, StructureRow>,
    rowIndexByBlockId: Map<string, number>,
    activeSceneBlockId: string | null,
};

export const deriveStructureRows = (
    content: FountainJSONContent[] | undefined,
    activeBlockId: string | null,
): StructureRowsState => {
    const blocks = collectStructureBlocks(content).filter(block => block.id.length > 0);
    const rows: StructureRow[] = [];
    const rowByBlockId = new Map<string, StructureRow>();
    const rowIndexByBlockId = new Map<string, number>();
    const sceneByBlockId = new Map<string, string>();
    let currentSceneBlockId: string | null = null;

    blocks.forEach(block => {
        if (block.blockType === ELEMENT_ACT) {
            const actRow: StructureActRow = {
                kind: 'act',
                blockId: block.id,
                name: normalizeActName(block.text),
                index: rows.length,
            };

            rows.push(actRow);
            rowByBlockId.set(block.id, actRow);
            rowIndexByBlockId.set(block.id, actRow.index);

            return;
        }

        if (block.blockType === ELEMENT_SCENE_HEADING) {
            currentSceneBlockId = block.id;
            sceneByBlockId.set(block.id, block.id);

            const sceneRow: StructureSceneRow = {
                kind: 'scene',
                blockId: block.id,
                title: block.text || 'Untitled scene',
                index: rows.length,
            };

            rows.push(sceneRow);
            rowByBlockId.set(block.id, sceneRow);
            rowIndexByBlockId.set(block.id, sceneRow.index);

            return;
        }

        if (currentSceneBlockId) {
            sceneByBlockId.set(block.id, currentSceneBlockId);
        }
    });

    const activeSceneBlockId = activeBlockId
        ? sceneByBlockId.get(activeBlockId) ?? (rowByBlockId.get(activeBlockId)?.kind === 'scene'
            ? activeBlockId
            : null)
        : null;

    return {
        rows,
        rowByBlockId,
        rowIndexByBlockId,
        activeSceneBlockId,
    };
};
