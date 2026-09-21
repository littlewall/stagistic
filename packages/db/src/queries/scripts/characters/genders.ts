import {and, asc, eq, type InferInsertModel} from 'drizzle-orm';

import {scriptCharacterGenders} from '../../../schema';
import type {ScriptCharacterGenderOption} from '../../../types';
import type {DbClient} from '../../types';
import type {GetScriptCharacterGenderByKeyPayload, UpsertScriptCharacterGenderPayload} from '../payloads';
import {mapGenderRow} from './mappers';

export const listScriptCharacterGenders = async (db: DbClient, scriptId: string): Promise<ScriptCharacterGenderOption[]> => {
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

export const insertScriptCharacterGenders = async (db: DbClient, rows: InferInsertModel<typeof scriptCharacterGenders>[]) => {
    if (rows.length === 0) {
        return;
    }

    await db.insert(scriptCharacterGenders).values(rows);
};

export const upsertScriptCharacterGender = async (db: DbClient, payload: UpsertScriptCharacterGenderPayload) => {
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

export const getScriptCharacterGenderByKey = async (
    db: DbClient,
    payload: GetScriptCharacterGenderByKeyPayload,
): Promise<ScriptCharacterGenderOption | null> => {
    const rows = await db
        .select({
            id: scriptCharacterGenders.id,
            genderKey: scriptCharacterGenders.genderKey,
            genderLabel: scriptCharacterGenders.genderLabel,
        })
        .from(scriptCharacterGenders)
        .where(and(eq(scriptCharacterGenders.scriptId, payload.scriptId), eq(scriptCharacterGenders.genderKey, payload.genderKey)))
        .limit(1);
    const row = rows[0];

    if (!row) {
        return null;
    }

    return mapGenderRow(row);
};
