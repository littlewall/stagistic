import {uuidv7} from '@stagistic/shared';

import * as dbQueries from '../../queries';
import type {CharacterMutationDeps} from './mutationDeps';
import {
    DEFAULT_GENDER_LABEL_BY_KEY,
    normalizeGenderKey,
    normalizeGenderLabel,
} from './normalization';
import {
    buildCharacterGenderPayload,
    buildCharacterGenderUpsertPayload,
} from './outboxPayloads';
import type {CharacterHandlers} from './types';

export const createGenderMutations = ({
    getDb,
    recordOutbox,
    syncDb,
}: CharacterMutationDeps): Pick<
    CharacterHandlers,
    | 'listScriptCharacterGenders'
    | 'setScriptCharacterGender'
    | 'upsertScriptCharacterGender'
    | 'upsertScriptCharacterGenderWithId'
> => {
    const listScriptCharacterGenders: CharacterHandlers['listScriptCharacterGenders'] = async scriptId => {
        const db = await getDb();

        return dbQueries.listScriptCharacterGenders(db, scriptId);
    };

    const setScriptCharacterGender: CharacterHandlers['setScriptCharacterGender'] = async (
        scriptId,
        characterId,
        genderKey,
    ) => {
        if (!characterId) {
            return null;
        }

        const normalizedGenderKey = genderKey === null
            ? null
            : normalizeGenderKey(genderKey);

        if (normalizedGenderKey !== null && normalizedGenderKey.length === 0) {
            return null;
        }

        const db = await getDb();
        const now = Date.now();
        const currentCharacter = await dbQueries.getScriptCharacterById(db, {
            scriptId,
            characterId,
        });

        if (!currentCharacter) {
            return null;
        }

        const existingGenderOption = normalizedGenderKey === null
            ? null
            : await dbQueries.getScriptCharacterGenderByKey(db, {
                scriptId,
                genderKey: normalizedGenderKey,
            });
        const defaultGenderLabel = normalizedGenderKey === null
            ? undefined
            : DEFAULT_GENDER_LABEL_BY_KEY.get(normalizedGenderKey);

        if (normalizedGenderKey !== null && !existingGenderOption && !defaultGenderLabel) {
            return null;
        }

        await db.transaction(async tx => {
            if (normalizedGenderKey !== null && !existingGenderOption && defaultGenderLabel) {
                await dbQueries.upsertScriptCharacterGender(tx, {
                    id: uuidv7(),
                    scriptId,
                    genderKey: normalizedGenderKey,
                    genderLabel: defaultGenderLabel,
                    createdAt: now,
                    updatedAt: now,
                });
            }

            await dbQueries.updateScriptCharacterGender(tx, {
                scriptId,
                characterId,
                genderKey: normalizedGenderKey,
                updatedAt: now,
            });
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `character:${characterId}`,
                opType: 'character.gender',
                occurredAt: now,
                payloadJson: buildCharacterGenderPayload(scriptId, characterId, normalizedGenderKey, now),
            }, tx);
        });
        await syncDb();

        return dbQueries.getScriptCharacterById(db, {
            scriptId,
            characterId,
        });
    };

    const upsertScriptCharacterGenderWithId: CharacterHandlers['upsertScriptCharacterGenderWithId'] = async (
        scriptId,
        input,
    ) => {
        const normalizedLabel = normalizeGenderLabel(input.label);
        const genderKey = normalizeGenderKey(normalizedLabel);

        if (!genderKey) {
            return null;
        }

        const db = await getDb();
        const now = input.timestamp ?? Date.now();

        await db.transaction(async tx => {
            await dbQueries.upsertScriptCharacterGender(tx, {
                id: input.id,
                scriptId,
                genderKey,
                genderLabel: normalizedLabel,
                createdAt: now,
                updatedAt: now,
            });
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `character-gender:${input.id}`,
                opType: 'character.gender.upsert',
                occurredAt: now,
                payloadJson: buildCharacterGenderUpsertPayload(scriptId, genderKey, normalizedLabel, now),
            }, tx);
        });
        await syncDb();

        return dbQueries.getScriptCharacterGenderByKey(db, {
            scriptId,
            genderKey,
        });
    };
    const upsertScriptCharacterGender: CharacterHandlers['upsertScriptCharacterGender'] = (
        scriptId,
        label,
    ) => upsertScriptCharacterGenderWithId(scriptId, {
        id: uuidv7(),
        label,
    });

    return {
        listScriptCharacterGenders,
        setScriptCharacterGender,
        upsertScriptCharacterGender,
        upsertScriptCharacterGenderWithId,
    };
};
