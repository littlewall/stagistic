import {
    and,
    asc,
    eq,
    inArray,
} from 'drizzle-orm';

import {
    scriptCharacterGroupMembers,
    scriptCharacters,
} from '../../../schema';
import type {ScriptCharacterGroupRef} from '../../../types';
import type {DbClient} from '../../types';

interface CreateScriptCharacterGroupInput {
    id: string,
    scriptId: string,
    characterKey: string,
    colorHex: string | null,
    createdAt: number,
    updatedAt: number,
}

interface ScriptCharacterGroupUpdateInput {
    scriptId: string,
    groupId: string,
    updatedAt: number,
}

interface RenameScriptCharacterGroupInput extends ScriptCharacterGroupUpdateInput {
    characterKey: string,
}

interface SetScriptCharacterGroupColorInput extends ScriptCharacterGroupUpdateInput {
    colorHex: string | null,
}

const groupSelectFields = {
    id: scriptCharacters.id,
    characterKey: scriptCharacters.characterKey,
    colorHex: scriptCharacters.colorHex,
};

const listMemberIdsByGroup = async (db: DbClient, groupIds: string[]) => {
    if (groupIds.length === 0) {
        return new Map<string, string[]>();
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

const mapGroupRow = (row: {
    id: string,
    characterKey: string,
    colorHex: string | null,
}, memberIds: string[]): ScriptCharacterGroupRef => ({
    id: row.id,
    kind: 'group',
    key: row.characterKey,
    colorHex: row.colorHex,
    memberIds,
});

export const listScriptCharacterGroups = async (
    db: DbClient,
    scriptId: string,
): Promise<ScriptCharacterGroupRef[]> => {
    const rows = await db
        .select(groupSelectFields)
        .from(scriptCharacters)
        .where(and(
            eq(scriptCharacters.scriptId, scriptId),
            eq(scriptCharacters.kind, 'group'),
        ))
        .orderBy(asc(scriptCharacters.characterKey));
    const memberIdsByGroup = await listMemberIdsByGroup(db, rows.map(row => row.id));

    return rows.map(row => mapGroupRow(row, memberIdsByGroup.get(row.id) ?? []));
};

export const getScriptCharacterGroupById = async (
    db: DbClient,
    input: Pick<ScriptCharacterGroupUpdateInput, 'scriptId' | 'groupId'>,
): Promise<ScriptCharacterGroupRef | null> => {
    const rows = await db
        .select(groupSelectFields)
        .from(scriptCharacters)
        .where(and(
            eq(scriptCharacters.scriptId, input.scriptId),
            eq(scriptCharacters.id, input.groupId),
            eq(scriptCharacters.kind, 'group'),
        ))
        .limit(1);
    const row = rows[0];

    if (!row) {
        return null;
    }

    const memberIdsByGroup = await listMemberIdsByGroup(db, [row.id]);

    return mapGroupRow(row, memberIdsByGroup.get(row.id) ?? []);
};

export const createScriptCharacterGroup = async (db: DbClient, input: CreateScriptCharacterGroupInput) => {
    await db.insert(scriptCharacters).values({
        id: input.id,
        scriptId: input.scriptId,
        characterKey: input.characterKey,
        kind: 'group',
        colorHex: input.colorHex,
        genderKey: null,
        notes: null,
        backstory: null,
        outline: null,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
    });
};

export const deleteScriptCharacterGroup = async (
    db: DbClient,
    input: Pick<ScriptCharacterGroupUpdateInput, 'scriptId' | 'groupId'>,
) => {
    await db.delete(scriptCharacters).where(and(
        eq(scriptCharacters.scriptId, input.scriptId),
        eq(scriptCharacters.id, input.groupId),
        eq(scriptCharacters.kind, 'group'),
    ));
};

export const renameScriptCharacterGroup = async (
    db: DbClient,
    input: RenameScriptCharacterGroupInput,
) => {
    await db.update(scriptCharacters).set({
        characterKey: input.characterKey,
        updatedAt: input.updatedAt,
    }).where(and(
        eq(scriptCharacters.scriptId, input.scriptId),
        eq(scriptCharacters.id, input.groupId),
        eq(scriptCharacters.kind, 'group'),
    ));
};

export const setScriptCharacterGroupColor = async (
    db: DbClient,
    input: SetScriptCharacterGroupColorInput,
) => {
    await db.update(scriptCharacters).set({
        colorHex: input.colorHex,
        updatedAt: input.updatedAt,
    }).where(and(
        eq(scriptCharacters.scriptId, input.scriptId),
        eq(scriptCharacters.id, input.groupId),
        eq(scriptCharacters.kind, 'group'),
    ));
};

export const replaceScriptCharacterGroupMembers = async (
    db: DbClient,
    input: {groupId: string, memberIds: string[]},
) => {
    await db.delete(scriptCharacterGroupMembers).where(eq(
        scriptCharacterGroupMembers.groupId,
        input.groupId,
    ));

    if (input.memberIds.length === 0) {
        return;
    }

    await db.insert(scriptCharacterGroupMembers).values(input.memberIds.map(characterId => ({
        groupId: input.groupId,
        characterId,
    })));
};
