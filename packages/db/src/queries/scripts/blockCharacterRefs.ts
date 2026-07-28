import {
    eq,
    inArray,
} from 'drizzle-orm';

import {
    scriptBlockCharacterRefs,
    scriptBlocks,
} from '../../schema';
import type {DbClient} from '../types';

export interface ScriptBlockCharacterRefRow {
    characterId: string,
    characterKey: string,
    isConfirmed: boolean,
}

export const listScriptBlockCharacterRefs = async (db: DbClient, blockId: string) => {
    return db
        .select()
        .from(scriptBlockCharacterRefs)
        .where(eq(scriptBlockCharacterRefs.blockId, blockId));
};

export const listScriptCharacterRefsByScript = async (db: DbClient, scriptId: string) => {
    return db
        .select({
            blockId: scriptBlockCharacterRefs.blockId,
            characterId: scriptBlockCharacterRefs.characterId,
            characterKey: scriptBlockCharacterRefs.characterKey,
            isConfirmed: scriptBlockCharacterRefs.isConfirmed,
        })
        .from(scriptBlockCharacterRefs)
        .innerJoin(scriptBlocks, eq(scriptBlockCharacterRefs.blockId, scriptBlocks.id))
        .where(eq(scriptBlocks.scriptId, scriptId));
};

export const listScriptCharacterRefsByCharacter = async (db: DbClient, characterId: string) => {
    return db
        .select()
        .from(scriptBlockCharacterRefs)
        .where(eq(scriptBlockCharacterRefs.characterId, characterId));
};

export const replaceScriptBlockCharacterRefs = async (
    db: DbClient,
    blockId: string,
    rows: ScriptBlockCharacterRefRow[],
) => {
    await db
        .delete(scriptBlockCharacterRefs)
        .where(eq(scriptBlockCharacterRefs.blockId, blockId));

    if (rows.length === 0) {
        return;
    }

    await db.insert(scriptBlockCharacterRefs).values(rows.map(row => ({
        blockId,
        characterId: row.characterId,
        characterKey: row.characterKey,
        isConfirmed: row.isConfirmed,
    })));
};

export interface ScriptBlockCharacterRefReplacement {
    blockId: string,
    rows: ScriptBlockCharacterRefRow[],
}

const REF_INSERT_BATCH_SIZE = 500;

/**
 * Replace refs for many blocks at once: one DELETE over all block ids,
 * then batched INSERTs — instead of two statements per block.
 */
export const bulkReplaceScriptBlockCharacterRefs = async (
    db: DbClient,
    replacements: ScriptBlockCharacterRefReplacement[],
) => {
    if (replacements.length === 0) {
        return;
    }

    await db
        .delete(scriptBlockCharacterRefs)
        .where(inArray(scriptBlockCharacterRefs.blockId, replacements.map(entry => entry.blockId)));

    const values = replacements.flatMap(entry => entry.rows.map(row => ({
        blockId: entry.blockId,
        characterId: row.characterId,
        characterKey: row.characterKey,
        isConfirmed: row.isConfirmed,
    })));

    for (let i = 0; i < values.length; i += REF_INSERT_BATCH_SIZE) {
        await db.insert(scriptBlockCharacterRefs).values(values.slice(i, i + REF_INSERT_BATCH_SIZE));
    }
};

export const deleteScriptBlockRefsByCharacterIds = async (db: DbClient, characterIds: string[]) => {
    if (characterIds.length === 0) {
        return;
    }

    await db
        .delete(scriptBlockCharacterRefs)
        .where(inArray(scriptBlockCharacterRefs.characterId, characterIds));
};
