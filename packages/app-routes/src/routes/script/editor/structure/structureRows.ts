import {
    collectStructureBlocks,
    ELEMENT_ACT,
    ELEMENT_SCENE_HEADING,
    type FountainJSONContent,
    normalizeActName,
} from '@stagistic/script-core';

export interface StructureActRow {
    kind: 'act',
    blockId: string,
    name: string,
    index: number,
}

export interface StructureSceneRow {
    kind: 'scene',
    blockId: string,
    title: string,
    index: number,
}

export type StructureRow = StructureActRow | StructureSceneRow;

export interface StructureRowsState {
    rows: StructureRow[],
    rowByBlockId: Map<string, StructureRow>,
    rowIndexByBlockId: Map<string, number>,
    activeSceneBlockId: string | null,
}

export interface StructureRowsDerived {
    rows: StructureRow[],
    rowByBlockId: Map<string, StructureRow>,
    rowIndexByBlockId: Map<string, number>,
    sceneByBlockId: Map<string, string>,
}

const EMPTY_STRUCTURE_ROWS_DERIVED: StructureRowsDerived = {
    rows: [],
    rowByBlockId: new Map<string, StructureRow>(),
    rowIndexByBlockId: new Map<string, number>(),
    sceneByBlockId: new Map<string, string>(),
};

const structureRowsCache = new WeakMap<FountainJSONContent[], StructureRowsDerived>();

const buildStructureRows = (
    content: FountainJSONContent[] | undefined,
): StructureRowsDerived => {
    if (!Array.isArray(content) || content.length === 0) {
        return EMPTY_STRUCTURE_ROWS_DERIVED;
    }

    const cached = structureRowsCache.get(content);

    if (cached) {
        return cached;
    }

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

    const result: StructureRowsDerived = {
        rows,
        rowByBlockId,
        rowIndexByBlockId,
        sceneByBlockId,
    };

    structureRowsCache.set(content, result);

    return result;
};

export const deriveStructureRowsBase = (
    content: FountainJSONContent[] | undefined,
): StructureRowsDerived => {
    return buildStructureRows(content);
};

export const resolveActiveSceneBlockId = (
    rowsState: Pick<StructureRowsDerived, 'sceneByBlockId' | 'rowByBlockId'>,
    activeBlockId: string | null,
) => {
    if (!activeBlockId) {
        return null;
    }

    const mappedSceneId = rowsState.sceneByBlockId.get(activeBlockId);

    if (mappedSceneId) {
        return mappedSceneId;
    }

    const directRow = rowsState.rowByBlockId.get(activeBlockId);

    return directRow?.kind === 'scene'
        ? activeBlockId
        : null;
};

export const deriveStructureRows = (
    content: FountainJSONContent[] | undefined,
    activeBlockId: string | null,
): StructureRowsState => {
    const baseState = deriveStructureRowsBase(content);
    const activeSceneBlockId = resolveActiveSceneBlockId(baseState, activeBlockId);

    return {
        rows: baseState.rows,
        rowByBlockId: baseState.rowByBlockId,
        rowIndexByBlockId: baseState.rowIndexByBlockId,
        activeSceneBlockId,
    };
};
