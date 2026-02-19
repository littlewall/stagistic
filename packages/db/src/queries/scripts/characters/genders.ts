import {
    and,
    asc,
    eq,
} from 'drizzle-orm';

import {scriptCharacterGenders} from '../../../schema';
import type {DbClient} from '../../types';
import {mapGenderRow} from './mappers';
import type {ScriptCharacterGenderOption} from './types';

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
