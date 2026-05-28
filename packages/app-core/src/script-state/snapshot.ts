import type {
    ScriptAct,
    ScriptBlock,
    ScriptBlockCharacterRef,
    ScriptLocation,
    ScriptScene,
} from '@stagistic/db';
import {
    buildScriptBlockIndex,
    ELEMENT_ACT,
    ELEMENT_SCENE_HEADING,
    type IndexedScriptBlock,
    type IndexedScriptCharacterRef,
    normalizeActName,
    type ScriptBlockIndexSnapshot,
    type ScriptDocument,
} from '@stagistic/script';

import type {ScriptStateRows} from './types';

interface BuildScriptStateRowsOptions {
    previousBlocksById?: ReadonlyMap<string, ScriptBlock>,
    previousScenesById?: ReadonlyMap<string, ScriptScene>,
    previousActsById?: ReadonlyMap<string, ScriptAct>,
    previousLocationsById?: ReadonlyMap<string, ScriptLocation>,
    precomputedIndexSnapshot?: ScriptBlockIndexSnapshot,
}

const toColumnGroupId = (columnGroupOrder: number | null): string | null => {
    if (columnGroupOrder === null || !Number.isFinite(columnGroupOrder)) {
        return null;
    }

    return `column-group:${Math.trunc(columnGroupOrder)}`;
};

const getCreatedAt = (previousRow: {createdAt: number} | null | undefined, now: number) => {
    return previousRow?.createdAt ?? now;
};

const toScriptBlockRow = (
    scriptId: string,
    block: IndexedScriptBlock,
    now: number,
    previousRowsById?: ReadonlyMap<string, ScriptBlock>,
): ScriptBlock => {
    const previousRow = previousRowsById?.get(block.blockId);

    return {
        id: block.blockId,
        scriptId,
        blockType: block.blockType,
        orderNo: block.orderNo,
        textContent: block.textContent,
        contentJson: previousRow?.contentJson ?? null,
        sceneId: block.sceneBlockId,
        actId: block.actBlockId,
        columnGroupId: toColumnGroupId(block.columnGroupOrder),
        columnIndex: block.columnOrder,
        createdAt: getCreatedAt(previousRow, now),
        updatedAt: now,
    };
};

const toScriptSceneRows = (
    scriptId: string,
    blocks: IndexedScriptBlock[],
    now: number,
    previousRowsById?: ReadonlyMap<string, ScriptScene>,
): ScriptScene[] => {
    const orderByBlockId = new Map<string, number>(blocks.map(block => [block.blockId, block.orderNo]));
    const rows: ScriptScene[] = [];

    blocks.forEach(block => {
        if (block.blockType !== ELEMENT_SCENE_HEADING) {
            return;
        }

        const previousRow = previousRowsById?.get(block.blockId);

        rows.push({
            id: block.blockId,
            scriptId,
            headingBlockId: block.blockId,
            sceneNumber: previousRow?.sceneNumber ?? null,
            colorHex: previousRow?.colorHex ?? null,
            synopsis: previousRow?.synopsis ?? null,
            locationId: previousRow?.locationId ?? null,
            createdAt: getCreatedAt(previousRow, now),
            updatedAt: now,
        });
    });

    return rows.sort((a, b) => {
        return (orderByBlockId.get(a.headingBlockId ?? '') ?? 0) - (orderByBlockId.get(b.headingBlockId ?? '') ?? 0);
    });
};

const toScriptActRows = (
    scriptId: string,
    blocks: IndexedScriptBlock[],
    now: number,
    previousRowsById?: ReadonlyMap<string, ScriptAct>,
): ScriptAct[] => {
    const orderByBlockId = new Map<string, number>(blocks.map(block => [block.blockId, block.orderNo]));
    const rows: ScriptAct[] = [];

    blocks.forEach(block => {
        if (block.blockType !== ELEMENT_ACT) {
            return;
        }

        const previousRow = previousRowsById?.get(block.blockId);

        rows.push({
            id: block.blockId,
            scriptId,
            headingBlockId: block.blockId,
            name: normalizeActName(block.textContent),
            createdAt: getCreatedAt(previousRow, now),
            updatedAt: now,
        });
    });

    return rows.sort((a, b) => {
        return (orderByBlockId.get(a.headingBlockId ?? '') ?? 0) - (orderByBlockId.get(b.headingBlockId ?? '') ?? 0);
    });
};

const toScriptBlockCharacterRefRows = (
    blocks: IndexedScriptBlock[],
): ScriptBlockCharacterRef[] => {
    const rows: ScriptBlockCharacterRef[] = [];

    blocks.forEach(block => {
        if (!Array.isArray(block.characterRefs) || block.characterRefs.length === 0) {
            return;
        }

        block.characterRefs.forEach(characterRef => {
            if (!characterRef.characterId) {
                return;
            }

            rows.push({
                blockId: block.blockId,
                characterId: characterRef.characterId,
                characterKey: characterRef.key,
                isConfirmed: true,
            });
        });
    });

    return rows;
};

export const toCharacterRefRowsForBlock = (
    blockId: string,
    refs: IndexedScriptCharacterRef[] | null,
): ScriptBlockCharacterRef[] => {
    if (!Array.isArray(refs) || refs.length === 0) {
        return [];
    }

    return refs
        .filter(ref => Boolean(ref.characterId))
        .map(ref => ({
            blockId,
            characterId: ref.characterId as string,
            characterKey: ref.key,
            isConfirmed: true,
        }));
};

export const buildScriptStateRowsFromDocument = (
    scriptId: string,
    value: ScriptDocument,
    options?: BuildScriptStateRowsOptions,
): ScriptStateRows => {
    const now = Date.now();
    const indexSnapshot = options?.precomputedIndexSnapshot ?? buildScriptBlockIndex(value).snapshot;
    const indexedBlocks = indexSnapshot.blocks;
    const previousLocationsById = options?.previousLocationsById;
    const locations = previousLocationsById
        ? Array.from(previousLocationsById.values()).map(location => ({
            ...location,
            updatedAt: now,
        }))
        : [];

    return {
        indexSnapshot,
        blocks: indexedBlocks.map(block => toScriptBlockRow(
            scriptId,
            block,
            now,
            options?.previousBlocksById,
        )),
        scenes: toScriptSceneRows(
            scriptId,
            indexedBlocks,
            now,
            options?.previousScenesById,
        ),
        acts: toScriptActRows(
            scriptId,
            indexedBlocks,
            now,
            options?.previousActsById,
        ),
        locations,
        blockCharacterRefs: toScriptBlockCharacterRefRows(indexedBlocks),
    };
};

export const toScriptBlockRowFromIndexedBlock = toScriptBlockRow;
