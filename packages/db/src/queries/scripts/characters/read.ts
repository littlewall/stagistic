import {
    and,
    asc,
    eq,
} from 'drizzle-orm';

import {scriptCharacters} from '../../../schema';
import type {ScriptCharacterRef} from '../../../types';
import type {DbClient} from '../../types';
import type {
    GetScriptCharacterByIdPayload,
    GetScriptCharacterByKeyPayload,
} from '../payloads';
import {mapCharacterRow} from './mappers';

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
            notes: scriptCharacters.notes,
            backstory: scriptCharacters.backstory,
        })
        .from(scriptCharacters)
        .where(eq(scriptCharacters.scriptId, scriptId))
        .orderBy(asc(scriptCharacters.characterKey));

    return rows.map(mapCharacterRow);
};

export const getScriptCharacterByKey = async (
    db: DbClient,
    payload: GetScriptCharacterByKeyPayload,
): Promise<ScriptCharacterRef | null> => {
    const rows = await db
        .select({
            id: scriptCharacters.id,
            characterKey: scriptCharacters.characterKey,
            colorHex: scriptCharacters.colorHex,
            genderKey: scriptCharacters.genderKey,
            notes: scriptCharacters.notes,
            backstory: scriptCharacters.backstory,
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

export const getScriptCharacterById = async (
    db: DbClient,
    payload: GetScriptCharacterByIdPayload,
): Promise<ScriptCharacterRef | null> => {
    const rows = await db
        .select({
            id: scriptCharacters.id,
            characterKey: scriptCharacters.characterKey,
            colorHex: scriptCharacters.colorHex,
            genderKey: scriptCharacters.genderKey,
            notes: scriptCharacters.notes,
            backstory: scriptCharacters.backstory,
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
