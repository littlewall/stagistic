import {
    type IndexedScriptBlock,
    normalizeCharacterColorHex,
    normalizeCharacterKey,
    type ScriptBlockIndexSnapshot,
} from '@stagistic/script';

import {
    getConfirmedCharacterColor,
    getUnconfirmedCharacterColor,
    normalizePersistentCharacterRefs,
} from '../characters/colorResolver';
import type {
    EditorLiveCharacterSnapshot,
    EditorLiveStructureRow,
    EditorLiveStructureSnapshot,
} from '../contracts';
import type {PersistentCharacterRef} from '../contracts';
import {
    EMPTY_CHARACTERS,
    EMPTY_STRUCTURE,
} from './store';

export interface SidebarProjectionColorContext {
    characterColorSaturation?: number,
    colorByCharacterId?: ReadonlyMap<string, string>,
    rememberedColorByKey?: ReadonlyMap<string, string>,
    persistentCharacters?: readonly PersistentCharacterRef[],
}

const normalizeText = (value: string) => value.trim();

const isCharacterBlockType = (blockType: string) => {
    return blockType === "character";
};

interface StructureBlockEntry {
    blockId: string,
    blockType: string,
    textContent: string,
    sceneBlockId?: string | null,
}

export const buildStructureSnapshotFromBlocks = (blocks: readonly StructureBlockEntry[]): EditorLiveStructureSnapshot => {
    const rows: EditorLiveStructureRow[] = [];
    const rowIndexByBlockId = new Map<string, number>();
    const sceneByBlockId = new Map<string, string>();
    let currentSceneBlockId: string | null = null;

    for (const block of blocks) {
        if (!block.blockId) {
            continue;
        }

        if (block.blockType === "act") {
            const row: EditorLiveStructureRow = {
                kind: 'act',
                blockId: block.blockId,
                name: normalizeText(block.textContent),
                index: rows.length,
            };

            rows.push(row);
            rowIndexByBlockId.set(block.blockId, row.index);
            currentSceneBlockId = null;
            continue;
        }

        if (block.blockType === "scene") {
            const row: EditorLiveStructureRow = {
                kind: 'scene',
                blockId: block.blockId,
                title: normalizeText(block.textContent) || 'Untitled scene',
                index: rows.length,
            };

            rows.push(row);
            rowIndexByBlockId.set(block.blockId, row.index);
            sceneByBlockId.set(block.blockId, block.blockId);
            currentSceneBlockId = block.blockId;
            continue;
        }

        const ancestorSceneId = block.sceneBlockId ?? currentSceneBlockId;

        if (ancestorSceneId) {
            sceneByBlockId.set(block.blockId, ancestorSceneId);
        }
    }

    if (rows.length === 0 && sceneByBlockId.size === 0) {
        return EMPTY_STRUCTURE;
    }

    return {
        rows,
        rowIndexByBlockId,
        sceneByBlockId,
    };
};

const buildStructureSnapshot = (indexSnapshot: ScriptBlockIndexSnapshot): EditorLiveStructureSnapshot => {
    if (!Array.isArray(indexSnapshot.blocks) || indexSnapshot.blocks.length === 0) {
        return EMPTY_STRUCTURE;
    }

    return buildStructureSnapshotFromBlocks(indexSnapshot.blocks);
};

const incrementCount = (counts: Map<string, number>, key: string) => {
    counts.set(key, (counts.get(key) ?? 0) + 1);
};

const applyBlockCharacterRefs = (
    countsByKey: Map<string, number>,
    countsByCharacterId: Map<string, number>,
    keyByCharacterId: Map<string, string>,
    characterIdByKey: Map<string, string>,
    block: IndexedScriptBlock,
) => {
    if (!isCharacterBlockType(block.blockType) || !Array.isArray(block.characterRefs)) {
        return;
    }

    block.characterRefs.forEach(characterRef => {
        const key = typeof characterRef.key === 'string'
            ? normalizeCharacterKey(characterRef.key)
            : '';

        if (!key) {
            return;
        }

        incrementCount(countsByKey, key);

        if (!characterRef.characterId) {
            return;
        }

        if (!characterIdByKey.has(key)) {
            characterIdByKey.set(key, characterRef.characterId);
        }

        incrementCount(countsByCharacterId, characterRef.characterId);
        keyByCharacterId.set(characterRef.characterId, key);
    });
};

const buildCharacterSnapshot = (
    indexSnapshot: ScriptBlockIndexSnapshot,
    colorContext?: SidebarProjectionColorContext,
): EditorLiveCharacterSnapshot => {
    if (!Array.isArray(indexSnapshot.blocks) || indexSnapshot.blocks.length === 0) {
        return EMPTY_CHARACTERS;
    }

    const countsByKey = new Map<string, number>();
    const countsByCharacterId = new Map<string, number>();
    const keyByCharacterId = new Map<string, string>();
    const characterIdByKey = new Map<string, string>();
    const displayColorByKey = new Map<string, string>();
    const normalizedPersistentCharacters = normalizePersistentCharacterRefs(colorContext?.persistentCharacters ?? []);
    const persistentCharacterByKey = new Map(
        normalizedPersistentCharacters.map(character => [character.key, character] as const),
    );
    const persistentCharacterById = new Map(
        normalizedPersistentCharacters.map(character => [character.id, character] as const),
    );
    const resolveConfirmedColorById = (characterId: string) => {
        const persistentCharacter = persistentCharacterById.get(characterId);

        return getConfirmedCharacterColor(
            characterId,
            colorContext?.colorByCharacterId?.get(characterId) ?? persistentCharacter?.colorHex ?? null,
            colorContext?.characterColorSaturation,
        );
    };

    indexSnapshot.blocks.forEach(block => {
        applyBlockCharacterRefs(
            countsByKey,
            countsByCharacterId,
            keyByCharacterId,
            characterIdByKey,
            block,
        );
    });

    countsByKey.forEach((_count, key) => {
        const linkedCharacterId = characterIdByKey.get(key);
        const persistentCharacter = persistentCharacterByKey.get(key);
        const rememberedColor = normalizeCharacterColorHex(colorContext?.rememberedColorByKey?.get(key));

        if (linkedCharacterId) {
            displayColorByKey.set(key, resolveConfirmedColorById(linkedCharacterId));

            return;
        }

        if (persistentCharacter) {
            displayColorByKey.set(key, resolveConfirmedColorById(persistentCharacter.id));

            return;
        }

        displayColorByKey.set(
            key,
            rememberedColor
                ?? getUnconfirmedCharacterColor(key, colorContext?.characterColorSaturation),
        );
    });

    if (countsByKey.size === 0 && countsByCharacterId.size === 0) {
        return EMPTY_CHARACTERS;
    }

    return {
        countsByKey,
        countsByCharacterId,
        keyByCharacterId,
        displayColorByKey,
    };
};

export const buildSidebarProjectionFromIndex = (
    indexSnapshot: ScriptBlockIndexSnapshot,
    colorContext?: SidebarProjectionColorContext,
) => {
    return {
        structure: buildStructureSnapshot(indexSnapshot),
        characters: buildCharacterSnapshot(indexSnapshot, colorContext),
    };
};
