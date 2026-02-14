import {
    and,
    asc,
    eq,
} from 'drizzle-orm';

import {scriptCharacters} from '../../schema';
import type {DbClient} from '../types';

type ScriptCharacterRef = {
    id: string,
    key: string,
};

export const listScriptCharacters = async (
    db: DbClient,
    scriptId: string,
): Promise<ScriptCharacterRef[]> => {
    const rows = await db
        .select({
            id: scriptCharacters.id,
            characterKey: scriptCharacters.characterKey,
        })
        .from(scriptCharacters)
        .where(eq(scriptCharacters.scriptId, scriptId))
        .orderBy(asc(scriptCharacters.characterKey));

    return rows.map(row => ({
        id: row.id,
        key: row.characterKey,
    }));
};

export const upsertScriptCharacter = async (db: DbClient, payload: {
    id: string,
    scriptId: string,
    characterKey: string,
    createdAt: number,
    updatedAt: number,
}) => {
    await db
        .insert(scriptCharacters)
        .values({
            id: payload.id,
            scriptId: payload.scriptId,
            characterKey: payload.characterKey,
            createdAt: payload.createdAt,
            updatedAt: payload.updatedAt,
        })
        .onConflictDoUpdate({
            target: [scriptCharacters.scriptId, scriptCharacters.characterKey],
            set: {
                updatedAt: payload.updatedAt,
            },
        });
};

export const deleteScriptCharacter = async (db: DbClient, payload: {
    scriptId: string,
    characterId: string,
}) => {
    await db
        .delete(scriptCharacters)
        .where(
            and(
                eq(scriptCharacters.scriptId, payload.scriptId),
                eq(scriptCharacters.id, payload.characterId),
            ),
        );
};

export const getScriptCharacterByKey = async (db: DbClient, payload: {
    scriptId: string,
    characterKey: string,
}): Promise<ScriptCharacterRef | null> => {
    const rows = await db
        .select({
            id: scriptCharacters.id,
            characterKey: scriptCharacters.characterKey,
        })
        .from(scriptCharacters)
        .where(
            and(
                eq(scriptCharacters.scriptId, payload.scriptId),
                eq(scriptCharacters.characterKey, payload.characterKey),
            ),
        )
        .limit(1);
    const row = rows[0];

    if (!row) {
        return null;
    }

    return {
        id: row.id,
        key: row.characterKey,
    };
};

export const getScriptCharacterById = async (db: DbClient, payload: {
    scriptId: string,
    characterId: string,
}): Promise<ScriptCharacterRef | null> => {
    const rows = await db
        .select({
            id: scriptCharacters.id,
            characterKey: scriptCharacters.characterKey,
        })
        .from(scriptCharacters)
        .where(
            and(
                eq(scriptCharacters.scriptId, payload.scriptId),
                eq(scriptCharacters.id, payload.characterId),
            ),
        )
        .limit(1);
    const row = rows[0];

    if (!row) {
        return null;
    }

    return {
        id: row.id,
        key: row.characterKey,
    };
};

export const updateScriptCharacterKey = async (db: DbClient, payload: {
    scriptId: string,
    characterId: string,
    characterKey: string,
    updatedAt: number,
}) => {
    await db
        .update(scriptCharacters)
        .set({
            characterKey: payload.characterKey,
            updatedAt: payload.updatedAt,
        })
        .where(
            and(
                eq(scriptCharacters.scriptId, payload.scriptId),
                eq(scriptCharacters.id, payload.characterId),
            ),
        );
};

export const touchScriptCharacter = async (db: DbClient, payload: {
    scriptId: string,
    characterId: string,
    updatedAt: number,
}) => {
    await db
        .update(scriptCharacters)
        .set({
            updatedAt: payload.updatedAt,
        })
        .where(
            and(
                eq(scriptCharacters.scriptId, payload.scriptId),
                eq(scriptCharacters.id, payload.characterId),
            ),
        );
};
