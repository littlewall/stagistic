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

export const deleteScriptBlockRefsByCharacterIds = async (db: DbClient, characterIds: string[]) => {
    if (characterIds.length === 0) {
        return;
    }

    await db
        .delete(scriptBlockCharacterRefs)
        .where(inArray(scriptBlockCharacterRefs.characterId, characterIds));
};
