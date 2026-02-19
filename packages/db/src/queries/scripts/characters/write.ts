import {
    and,
    eq,
} from 'drizzle-orm';

import {scriptCharacters} from '../../../schema';
import type {DbClient} from '../../types';
import type {
    DeleteScriptCharacterPayload,
    TouchScriptCharacterPayload,
    UpdateScriptCharacterColorPayload,
    UpdateScriptCharacterGenderPayload,
    UpdateScriptCharacterKeyPayload,
    UpsertScriptCharacterPayload,
} from '../payloads';

export const upsertScriptCharacter = async (
    db: DbClient,
    payload: UpsertScriptCharacterPayload,
) => {
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

export const deleteScriptCharacter = async (
    db: DbClient,
    payload: DeleteScriptCharacterPayload,
) => {
    await db
        .delete(scriptCharacters)
        .where(
            and(
                eq(scriptCharacters.scriptId, payload.scriptId),
                eq(scriptCharacters.id, payload.characterId),
            ),
        );
};

export const updateScriptCharacterKey = async (
    db: DbClient,
    payload: UpdateScriptCharacterKeyPayload,
) => {
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

export const touchScriptCharacter = async (
    db: DbClient,
    payload: TouchScriptCharacterPayload,
) => {
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

export const updateScriptCharacterColor = async (
    db: DbClient,
    payload: UpdateScriptCharacterColorPayload,
) => {
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

export const updateScriptCharacterGender = async (
    db: DbClient,
    payload: UpdateScriptCharacterGenderPayload,
) => {
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
