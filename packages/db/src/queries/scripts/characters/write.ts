import {and, eq, type InferInsertModel} from 'drizzle-orm';

import {scriptCharacters} from '../../../schema';
import type {DbClient} from '../../types';
import type {
    DeleteScriptCharacterPayload,
    TouchScriptCharacterPayload,
    UpdateScriptCharacterBackstoryPayload,
    UpdateScriptCharacterColorPayload,
    UpdateScriptCharacterGenderPayload,
    UpdateScriptCharacterKeyPayload,
    UpdateScriptCharacterNotesPayload,
    UpdateScriptCharacterOutlinePayload,
    UpdateScriptCharacterVocalRangePayload,
    UpdateScriptCharacterVoiceTypePayload,
    UpsertScriptCharacterPayload,
} from '../payloads';

export const insertScriptCharacters = async (db: DbClient, rows: InferInsertModel<typeof scriptCharacters>[]) => {
    if (rows.length === 0) {
        return;
    }

    await db.insert(scriptCharacters).values(rows);
};

export const upsertScriptCharacter = async (db: DbClient, payload: UpsertScriptCharacterPayload) => {
    await db
        .insert(scriptCharacters)
        .values({
            id: payload.id,
            scriptId: payload.scriptId,
            characterKey: payload.characterKey,
            kind: 'character',
            colorHex: payload.colorHex ?? null,
            genderKey: payload.genderKey ?? null,
            notes: payload.notes ?? null,
            backstory: payload.backstory ?? null,
            outline: payload.outline ?? null,
            voiceType: payload.voiceType ?? null,
            vocalRangeLow: payload.vocalRangeLow ?? null,
            vocalRangeHigh: payload.vocalRangeHigh ?? null,
            createdAt: payload.createdAt,
            updatedAt: payload.updatedAt,
        })
        .onConflictDoUpdate({
            target: [scriptCharacters.scriptId, scriptCharacters.characterKey],
            set: {
                colorHex: payload.colorHex ?? null,
                genderKey: payload.genderKey ?? null,
                notes: payload.notes ?? null,
                backstory: payload.backstory ?? null,
                outline: payload.outline ?? null,
                voiceType: payload.voiceType ?? null,
                vocalRangeLow: payload.vocalRangeLow ?? null,
                vocalRangeHigh: payload.vocalRangeHigh ?? null,
                updatedAt: payload.updatedAt,
            },
            setWhere: eq(scriptCharacters.kind, 'character'),
        });
};

export const deleteScriptCharacter = async (db: DbClient, payload: DeleteScriptCharacterPayload) => {
    await db
        .delete(scriptCharacters)
        .where(and(eq(scriptCharacters.scriptId, payload.scriptId), eq(scriptCharacters.id, payload.characterId), eq(scriptCharacters.kind, 'character')));
};

export const updateScriptCharacterKey = async (db: DbClient, payload: UpdateScriptCharacterKeyPayload) => {
    await db
        .update(scriptCharacters)
        .set({
            characterKey: payload.characterKey,
            updatedAt: payload.updatedAt,
        })
        .where(and(eq(scriptCharacters.scriptId, payload.scriptId), eq(scriptCharacters.id, payload.characterId), eq(scriptCharacters.kind, 'character')));
};

export const touchScriptCharacter = async (db: DbClient, payload: TouchScriptCharacterPayload) => {
    await db
        .update(scriptCharacters)
        .set({
            updatedAt: payload.updatedAt,
        })
        .where(and(eq(scriptCharacters.scriptId, payload.scriptId), eq(scriptCharacters.id, payload.characterId), eq(scriptCharacters.kind, 'character')));
};

export const updateScriptCharacterColor = async (db: DbClient, payload: UpdateScriptCharacterColorPayload) => {
    await db
        .update(scriptCharacters)
        .set({
            colorHex: payload.colorHex,
            updatedAt: payload.updatedAt,
        })
        .where(and(eq(scriptCharacters.scriptId, payload.scriptId), eq(scriptCharacters.id, payload.characterId), eq(scriptCharacters.kind, 'character')));
};

export const updateScriptCharacterGender = async (db: DbClient, payload: UpdateScriptCharacterGenderPayload) => {
    await db
        .update(scriptCharacters)
        .set({
            genderKey: payload.genderKey,
            updatedAt: payload.updatedAt,
        })
        .where(and(eq(scriptCharacters.scriptId, payload.scriptId), eq(scriptCharacters.id, payload.characterId), eq(scriptCharacters.kind, 'character')));
};

export const updateScriptCharacterNotes = async (db: DbClient, payload: UpdateScriptCharacterNotesPayload) => {
    await db
        .update(scriptCharacters)
        .set({
            notes: payload.notes,
            updatedAt: payload.updatedAt,
        })
        .where(and(eq(scriptCharacters.scriptId, payload.scriptId), eq(scriptCharacters.id, payload.characterId), eq(scriptCharacters.kind, 'character')));
};

export const updateScriptCharacterBackstory = async (db: DbClient, payload: UpdateScriptCharacterBackstoryPayload) => {
    await db
        .update(scriptCharacters)
        .set({
            backstory: payload.backstory,
            updatedAt: payload.updatedAt,
        })
        .where(and(eq(scriptCharacters.scriptId, payload.scriptId), eq(scriptCharacters.id, payload.characterId), eq(scriptCharacters.kind, 'character')));
};

export const updateScriptCharacterOutline = async (db: DbClient, payload: UpdateScriptCharacterOutlinePayload) => {
    await db
        .update(scriptCharacters)
        .set({
            outline: payload.outline,
            updatedAt: payload.updatedAt,
        })
        .where(and(eq(scriptCharacters.scriptId, payload.scriptId), eq(scriptCharacters.id, payload.characterId), eq(scriptCharacters.kind, 'character')));
};

export const updateScriptCharacterVoiceType = async (db: DbClient, payload: UpdateScriptCharacterVoiceTypePayload) => {
    await db
        .update(scriptCharacters)
        .set({
            voiceType: payload.voiceType,
            updatedAt: payload.updatedAt,
        })
        .where(and(eq(scriptCharacters.scriptId, payload.scriptId), eq(scriptCharacters.id, payload.characterId), eq(scriptCharacters.kind, 'character')));
};

export const updateScriptCharacterVocalRange = async (db: DbClient, payload: UpdateScriptCharacterVocalRangePayload) => {
    await db
        .update(scriptCharacters)
        .set({
            vocalRangeLow: payload.vocalRangeLow,
            vocalRangeHigh: payload.vocalRangeHigh,
            updatedAt: payload.updatedAt,
        })
        .where(and(eq(scriptCharacters.scriptId, payload.scriptId), eq(scriptCharacters.id, payload.characterId), eq(scriptCharacters.kind, 'character')));
};
