import {
    and,
    asc,
    eq,
    inArray,
    type SQL,
} from 'drizzle-orm';

import {
    scriptCharacterGroupMembers,
    scriptCharacters,
} from '../../../schema';
import type {
    ScriptCharacterRef,
    ScriptSpeakingEntityRef,
} from '../../../types';
import type {DbClient} from '../../types';
import type {
    GetScriptCharacterByIdPayload,
    GetScriptCharacterByKeyPayload,
    GetScriptSpeakingEntityByIdPayload,
    GetScriptSpeakingEntityByKeyPayload,
} from '../payloads';
import {
    mapCharacterRow,
    mapSpeakingEntityRow,
} from './mappers';

const characterSelectFields = {
    id: scriptCharacters.id,
    kind: scriptCharacters.kind,
    characterKey: scriptCharacters.characterKey,
    colorHex: scriptCharacters.colorHex,
    genderKey: scriptCharacters.genderKey,
    notes: scriptCharacters.notes,
    backstory: scriptCharacters.backstory,
    outline: scriptCharacters.outline,
};

const listMemberIdsByGroup = async (db: DbClient, groupIds: string[]): Promise<Map<string, string[]>> => {
    if (groupIds.length === 0) {
        return new Map();
    }

    const rows = await db
        .select({
            groupId: scriptCharacterGroupMembers.groupId,
            characterId: scriptCharacterGroupMembers.characterId,
        })
        .from(scriptCharacterGroupMembers)
        .where(inArray(scriptCharacterGroupMembers.groupId, groupIds))
        .orderBy(
            asc(scriptCharacterGroupMembers.groupId),
            asc(scriptCharacterGroupMembers.characterId),
        );
    const memberIdsByGroup = new Map<string, string[]>();

    for (const row of rows) {
        const memberIds = memberIdsByGroup.get(row.groupId) ?? [];

        memberIds.push(row.characterId);
        memberIdsByGroup.set(row.groupId, memberIds);
    }

    return memberIdsByGroup;
};

const getScriptCharacterWhere = async (
    db: DbClient,
    where: SQL | undefined,
): Promise<ScriptCharacterRef | null> => {
    const rows = await db
        .select(characterSelectFields)
        .from(scriptCharacters)
        .where(where)
        .limit(1);
    const row = rows[0];

    if (!row) {
        return null;
    }

    return mapCharacterRow(row);
};

const getScriptSpeakingEntityWhere = async (
    db: DbClient,
    where: SQL | undefined,
): Promise<ScriptSpeakingEntityRef | null> => {
    const rows = await db
        .select(characterSelectFields)
        .from(scriptCharacters)
        .where(where)
        .limit(1);
    const row = rows[0];

    if (!row) {
        return null;
    }

    const memberIdsByGroup = await listMemberIdsByGroup(db, row.kind === 'group' ? [row.id] : []);

    return mapSpeakingEntityRow(row, memberIdsByGroup.get(row.id) ?? []);
};

export const listScriptCharacters = async (
    db: DbClient,
    scriptId: string,
): Promise<ScriptCharacterRef[]> => {
    const rows = await db
        .select(characterSelectFields)
        .from(scriptCharacters)
        .where(and(
            eq(scriptCharacters.scriptId, scriptId),
            eq(scriptCharacters.kind, 'character'),
        ))
        .orderBy(asc(scriptCharacters.characterKey));

    return rows.map(mapCharacterRow);
};

export const getScriptCharacterByKey = async (
    db: DbClient,
    payload: GetScriptCharacterByKeyPayload,
): Promise<ScriptCharacterRef | null> => {
    return getScriptCharacterWhere(db, and(
        eq(scriptCharacters.scriptId, payload.scriptId),
        eq(scriptCharacters.characterKey, payload.characterKey),
        eq(scriptCharacters.kind, 'character'),
    ));
};

export const getScriptCharacterById = async (
    db: DbClient,
    payload: GetScriptCharacterByIdPayload,
): Promise<ScriptCharacterRef | null> => {
    return getScriptCharacterWhere(db, and(
        eq(scriptCharacters.scriptId, payload.scriptId),
        eq(scriptCharacters.id, payload.characterId),
        eq(scriptCharacters.kind, 'character'),
    ));
};

export const listScriptSpeakingEntities = async (
    db: DbClient,
    scriptId: string,
): Promise<ScriptSpeakingEntityRef[]> => {
    const rows = await db
        .select(characterSelectFields)
        .from(scriptCharacters)
        .where(eq(scriptCharacters.scriptId, scriptId))
        .orderBy(asc(scriptCharacters.characterKey));
    const groupIds = rows
        .filter(row => row.kind === 'group')
        .map(row => row.id);
    const memberIdsByGroup = await listMemberIdsByGroup(db, groupIds);

    return rows.map(row => mapSpeakingEntityRow(row, memberIdsByGroup.get(row.id) ?? []));
};

export const getScriptSpeakingEntityByKey = async (
    db: DbClient,
    payload: GetScriptSpeakingEntityByKeyPayload,
): Promise<ScriptSpeakingEntityRef | null> => {
    return getScriptSpeakingEntityWhere(db, and(
        eq(scriptCharacters.scriptId, payload.scriptId),
        eq(scriptCharacters.characterKey, payload.characterKey),
    ));
};

export const getScriptSpeakingEntityById = async (
    db: DbClient,
    payload: GetScriptSpeakingEntityByIdPayload,
): Promise<ScriptSpeakingEntityRef | null> => {
    return getScriptSpeakingEntityWhere(db, and(
        eq(scriptCharacters.scriptId, payload.scriptId),
        eq(scriptCharacters.id, payload.characterId),
    ));
};
