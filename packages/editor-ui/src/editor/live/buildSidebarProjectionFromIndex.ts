import {
    ELEMENT_ACT,
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_SCENE_HEADING,
    type IndexedScriptBlock,
    normalizeActName,
    type ScriptBlockIndexSnapshot,
} from '@stagistic/script-core';

import type {
    EditorLiveCharacterSnapshot,
    EditorLiveStructureRow,
    EditorLiveStructureSnapshot,
} from '../contracts';

const EMPTY_STRUCTURE: EditorLiveStructureSnapshot = {
    rows: [],
    rowIndexByBlockId: new Map<string, number>(),
    sceneByBlockId: new Map<string, string>(),
};

const EMPTY_CHARACTERS: EditorLiveCharacterSnapshot = {
    countsByKey: new Map<string, number>(),
    countsByCharacterId: new Map<string, number>(),
    keyByCharacterId: new Map<string, string>(),
};

const normalizeText = (value: string) => value.trim();

const isCharacterBlockType = (blockType: string) => {
    return blockType === ELEMENT_CHARACTER || blockType === ELEMENT_DUAL_DIALOGUE_CHARACTER;
};

const buildStructureSnapshot = (indexSnapshot: ScriptBlockIndexSnapshot): EditorLiveStructureSnapshot => {
    if (!Array.isArray(indexSnapshot.blocks) || indexSnapshot.blocks.length === 0) {
        return EMPTY_STRUCTURE;
    }

    const rows: EditorLiveStructureRow[] = [];
    const rowIndexByBlockId = new Map<string, number>();
    const sceneByBlockId = new Map<string, string>();

    indexSnapshot.blocks.forEach(block => {
        if (!block.blockId) {
            return;
        }

        if (block.blockType === ELEMENT_ACT) {
            const row: EditorLiveStructureRow = {
                kind: 'act',
                blockId: block.blockId,
                name: normalizeActName(block.textContent),
                index: rows.length,
            };

            rows.push(row);
            rowIndexByBlockId.set(block.blockId, row.index);

            return;
        }

        if (block.blockType === ELEMENT_SCENE_HEADING) {
            const row: EditorLiveStructureRow = {
                kind: 'scene',
                blockId: block.blockId,
                title: normalizeText(block.textContent) || 'Untitled scene',
                index: rows.length,
            };

            rows.push(row);
            rowIndexByBlockId.set(block.blockId, row.index);
            sceneByBlockId.set(block.blockId, block.blockId);

            return;
        }

        if (block.sceneBlockId) {
            sceneByBlockId.set(block.blockId, block.sceneBlockId);
        }
    });

    if (rows.length === 0 && sceneByBlockId.size === 0) {
        return EMPTY_STRUCTURE;
    }

    return {
        rows,
        rowIndexByBlockId,
        sceneByBlockId,
    };
};

const incrementCount = (counts: Map<string, number>, key: string) => {
    counts.set(key, (counts.get(key) ?? 0) + 1);
};

const applyBlockCharacterRefs = (
    countsByKey: Map<string, number>,
    countsByCharacterId: Map<string, number>,
    keyByCharacterId: Map<string, string>,
    block: IndexedScriptBlock,
) => {
    if (!isCharacterBlockType(block.blockType) || !Array.isArray(block.characterRefs)) {
        return;
    }

    block.characterRefs.forEach(characterRef => {
        const key = typeof characterRef.key === 'string' ? characterRef.key.trim() : '';

        if (!key) {
            return;
        }

        incrementCount(countsByKey, key);

        if (!characterRef.characterId) {
            return;
        }

        incrementCount(countsByCharacterId, characterRef.characterId);
        keyByCharacterId.set(characterRef.characterId, key);
    });
};

const buildCharacterSnapshot = (indexSnapshot: ScriptBlockIndexSnapshot): EditorLiveCharacterSnapshot => {
    if (!Array.isArray(indexSnapshot.blocks) || indexSnapshot.blocks.length === 0) {
        return EMPTY_CHARACTERS;
    }

    const countsByKey = new Map<string, number>();
    const countsByCharacterId = new Map<string, number>();
    const keyByCharacterId = new Map<string, string>();

    indexSnapshot.blocks.forEach(block => {
        applyBlockCharacterRefs(countsByKey, countsByCharacterId, keyByCharacterId, block);
    });

    if (countsByKey.size === 0 && countsByCharacterId.size === 0) {
        return EMPTY_CHARACTERS;
    }

    return {
        countsByKey,
        countsByCharacterId,
        keyByCharacterId,
    };
};

export const buildSidebarProjectionFromIndex = (indexSnapshot: ScriptBlockIndexSnapshot) => {
    return {
        structure: buildStructureSnapshot(indexSnapshot),
        characters: buildCharacterSnapshot(indexSnapshot),
    };
};
