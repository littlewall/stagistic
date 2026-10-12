import {SCRIPT_RECORD_ID} from '@stagistic/sync-engine';
import {
    and,
    eq,
    ne,
} from 'drizzle-orm';

import {
    scriptCharacterGenders,
    scriptCharacterGroupMembers,
    scriptCharacters,
    scripts,
} from '../../../schema';
import {
    existingIds,
    ids,
    num,
    str,
    type Upserts,
    type WriteContext,
} from './shared';

export const writeScript = async ({
    tx,
    scriptId,
    now,
}: WriteContext, upserts: Upserts) => {
    const record = upserts[SCRIPT_RECORD_ID];

    if (record) {
        await tx.update(scripts).set({
            title: str(record.title) ?? '',
            subtitle: str(record.subtitle),
            updatedAt: now,
        }).where(eq(scripts.id, scriptId));
    }
};

export const writeCharacters = async ({
    tx,
    scriptId,
    now,
}: WriteContext, upserts: Upserts) => {
    for (const [id, record] of Object.entries(upserts)) {
        if (!record) {
            await tx.delete(scriptCharacters).where(and(eq(scriptCharacters.scriptId, scriptId), eq(scriptCharacters.id, id)));
            continue;
        }

        const characterKey = str(record.key);
        const taken = characterKey !== null && (await tx
            .select({id: scriptCharacters.id})
            .from(scriptCharacters)
            .where(and(eq(scriptCharacters.scriptId, scriptId), eq(scriptCharacters.characterKey, characterKey), ne(scriptCharacters.id, id)))).length > 0;

        if (characterKey === null || taken) {
            continue;
        }

        const fields = {
            characterKey,
            kind: str(record.kind) ?? 'character',
            colorHex: str(record.colorHex),
            genderKey: str(record.genderKey),
            notes: str(record.notes),
            backstory: str(record.backstory),
            outline: str(record.outline),
            voiceType: str(record.voiceType),
            vocalRangeLow: str(record.vocalRangeLow),
            vocalRangeHigh: str(record.vocalRangeHigh),
            updatedAt: now,
        };

        await tx
            .insert(scriptCharacters)
            .values({
                id,
                scriptId,
                ...fields,
                createdAt: num(record.createdAt, now),
            })
            .onConflictDoUpdate({target: scriptCharacters.id, set: fields});
    }

    // Group members after all characters exist.
    const known = await existingIds(tx, scriptCharacters, scriptId);

    for (const [id, record] of Object.entries(upserts)) {
        if (!record || record.kind !== 'group' || !known.has(id)) {
            continue;
        }

        await tx.delete(scriptCharacterGroupMembers).where(eq(scriptCharacterGroupMembers.groupId, id));

        const memberIds = ids(record.memberIds).filter(memberId => known.has(memberId) && memberId !== id);

        if (memberIds.length > 0) {
            await tx.insert(scriptCharacterGroupMembers).values(memberIds.map(characterId => ({groupId: id, characterId})));
        }
    }
};

export const writeGenders = async ({
    tx,
    scriptId,
    now,
}: WriteContext, upserts: Upserts) => {
    for (const [id, record] of Object.entries(upserts)) {
        if (!record) {
            await tx.delete(scriptCharacterGenders).where(and(eq(scriptCharacterGenders.scriptId, scriptId), eq(scriptCharacterGenders.id, id)));
            continue;
        }

        const genderKey = str(record.key);
        const taken = genderKey !== null && (await tx
            .select({id: scriptCharacterGenders.id})
            .from(scriptCharacterGenders)
            .where(and(
                eq(scriptCharacterGenders.scriptId, scriptId),
                eq(scriptCharacterGenders.genderKey, genderKey),
                ne(scriptCharacterGenders.id, id),
            ))).length > 0;

        if (genderKey === null || taken) {
            continue;
        }

        const fields = {
            genderKey,
            genderLabel: str(record.label) ?? genderKey,
            updatedAt: now,
        };

        await tx
            .insert(scriptCharacterGenders)
            .values({
                id,
                scriptId,
                ...fields,
                createdAt: num(record.createdAt, now),
            })
            .onConflictDoUpdate({target: scriptCharacterGenders.id, set: fields});
    }
};
