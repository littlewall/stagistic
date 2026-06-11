import {
    ELEMENT_ACT,
    ELEMENT_CHARACTER,
    ELEMENT_SCENE_HEADING,
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

const EMPTY_STRUCTURE: EditorLiveStructureSnapshot = {
    rows: [],
    rowIndexByBlockId: new Map<string, number>(),
    sceneByBlockId: new Map<string, string>(),
};

const EMPTY_CHARACTERS: EditorLiveCharacterSnapshot = {
    countsByKey: new Map<string, number>(),
    countsByCharacterId: new Map<string, number>(),
    keyByCharacterId: new Map<string, string>(),
    displayColorByKey: new Map<string, string>(),
};

export interface SidebarProjectionColorContext {
    characterColorSaturation?: number,
    colorByCharacterId?: ReadonlyMap<string, string>,
    rememberedColorByKey?: ReadonlyMap<string, string>,
    persistentCharacters?: readonly PersistentCharacterRef[],
}

const normalizeText = (value: string) => value.trim();

const isCharacterBlockType = (blockType: string) => {
    return blockType === ELEMENT_CHARACTER;
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
                name: normalizeText(block.textContent),
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
