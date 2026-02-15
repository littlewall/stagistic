import {
    and,
    asc,
    eq,
} from 'drizzle-orm';

import {
    scriptCharacterGenders,
    scriptCharacters,
} from '../../schema';
import type {DbClient} from '../types';

export type ScriptCharacterRef = {
    id: string,
    key: string,
    colorHex: string | null,
    genderKey: string | null,
};

export type ScriptCharacterGenderOption = {
    id: string,
    key: string,
    label: string,
};

const mapCharacterRow = (row: {
    id: string,
    characterKey: string,
    colorHex: string | null,
    genderKey: string | null,
}): ScriptCharacterRef => {
    return {
        id: row.id,
        key: row.characterKey,
        colorHex: row.colorHex,
        genderKey: row.genderKey,
    };
};

const mapGenderRow = (row: {
    id: string,
    genderKey: string,
    genderLabel: string,
}): ScriptCharacterGenderOption => {
    return {
        id: row.id,
        key: row.genderKey,
        label: row.genderLabel,
    };
};

export const listScriptCharacters = async (
    db: DbClient,
    scriptId: string,
): Promise<ScriptCharacterRef[]> => {
    const rows = await db
        .select({
            id: scriptCharacters.id,
            characterKey: scriptCharacters.characterKey,
            colorHex: scriptCharacters.colorHex,
            genderKey: scriptCharacters.genderKey,
        })
        .from(scriptCharacters)
        .where(eq(scriptCharacters.scriptId, scriptId))
        .orderBy(asc(scriptCharacters.characterKey));

    return rows.map(mapCharacterRow);
};

export const upsertScriptCharacter = async (db: DbClient, payload: {
    id: string,
    scriptId: string,
    characterKey: string,
    colorHex?: string | null,
    genderKey?: string | null,
    createdAt: number,
    updatedAt: number,
}) => {
    await db
        .insert(scriptCharacters)
        .values({
            id: payload.id,
            scriptId: payload.scriptId,
            characterKey: payload.characterKey,
            colorHex: payload.colorHex ?? null,
            genderKey: payload.genderKey ?? null,
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
            colorHex: scriptCharacters.colorHex,
            genderKey: scriptCharacters.genderKey,
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

    return mapCharacterRow(row);
};

export const getScriptCharacterById = async (db: DbClient, payload: {
    scriptId: string,
    characterId: string,
}): Promise<ScriptCharacterRef | null> => {
    const rows = await db
        .select({
            id: scriptCharacters.id,
            characterKey: scriptCharacters.characterKey,
            colorHex: scriptCharacters.colorHex,
            genderKey: scriptCharacters.genderKey,
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

    return mapCharacterRow(row);
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

export const updateScriptCharacterColor = async (db: DbClient, payload: {
    scriptId: string,
    characterId: string,
    colorHex: string | null,
    updatedAt: number,
}) => {
    await db
        .update(scriptCharacters)
        .set({
            colorHex: payload.colorHex,
            updatedAt: payload.updatedAt,
        })
        .where(
            and(
                eq(scriptCharacters.scriptId, payload.scriptId),
                eq(scriptCharacters.id, payload.characterId),
            ),
        );
};

export const updateScriptCharacterGender = async (db: DbClient, payload: {
    scriptId: string,
    characterId: string,
    genderKey: string | null,
    updatedAt: number,
}) => {
    await db
        .update(scriptCharacters)
        .set({
            genderKey: payload.genderKey,
            updatedAt: payload.updatedAt,
        })
        .where(
            and(
                eq(scriptCharacters.scriptId, payload.scriptId),
                eq(scriptCharacters.id, payload.characterId),
            ),
        );
};

export const listScriptCharacterGenders = async (
    db: DbClient,
    scriptId: string,
): Promise<ScriptCharacterGenderOption[]> => {
    const rows = await db
        .select({
            id: scriptCharacterGenders.id,
            genderKey: scriptCharacterGenders.genderKey,
            genderLabel: scriptCharacterGenders.genderLabel,
        })
        .from(scriptCharacterGenders)
        .where(eq(scriptCharacterGenders.scriptId, scriptId))
        .orderBy(asc(scriptCharacterGenders.genderLabel));

    return rows.map(mapGenderRow);
};

export const upsertScriptCharacterGender = async (db: DbClient, payload: {
    id: string,
    scriptId: string,
    genderKey: string,
    genderLabel: string,
    createdAt: number,
    updatedAt: number,
}) => {
    await db
        .insert(scriptCharacterGenders)
        .values({
            id: payload.id,
            scriptId: payload.scriptId,
            genderKey: payload.genderKey,
            genderLabel: payload.genderLabel,
            createdAt: payload.createdAt,
            updatedAt: payload.updatedAt,
        })
        .onConflictDoUpdate({
            target: [scriptCharacterGenders.scriptId, scriptCharacterGenders.genderKey],
            set: {
                updatedAt: payload.updatedAt,
            },
        });
};

export const getScriptCharacterGenderByKey = async (db: DbClient, payload: {
    scriptId: string,
    genderKey: string,
}): Promise<ScriptCharacterGenderOption | null> => {
    const rows = await db
        .select({
            id: scriptCharacterGenders.id,
            genderKey: scriptCharacterGenders.genderKey,
            genderLabel: scriptCharacterGenders.genderLabel,
        })
        .from(scriptCharacterGenders)
        .where(
            and(
                eq(scriptCharacterGenders.scriptId, payload.scriptId),
                eq(scriptCharacterGenders.genderKey, payload.genderKey),
            ),
        )
        .limit(1);
    const row = rows[0];

    if (!row) {
        return null;
    }

    return mapGenderRow(row);
};
