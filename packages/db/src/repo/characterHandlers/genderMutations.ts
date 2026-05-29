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
}: CharacterMutationDeps): Pick<
    CharacterHandlers,
    'listScriptCharacterGenders' | 'setScriptCharacterGender' | 'upsertScriptCharacterGender'
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

        if (normalizedGenderKey !== null) {
            const genderOption = await dbQueries.getScriptCharacterGenderByKey(db, {
                scriptId,
                genderKey: normalizedGenderKey,
            });

            if (!genderOption) {
                const defaultGenderLabel = DEFAULT_GENDER_LABEL_BY_KEY.get(normalizedGenderKey);

                if (!defaultGenderLabel) {
                    return null;
                }

                await dbQueries.upsertScriptCharacterGender(db, {
                    id: uuidv7(),
                    scriptId,
                    genderKey: normalizedGenderKey,
                    genderLabel: defaultGenderLabel,
                    createdAt: now,
                    updatedAt: now,
                });
            }
        }

        await dbQueries.updateScriptCharacterGender(db, {
            scriptId,
            characterId,
            genderKey: normalizedGenderKey,
            updatedAt: now,
        });
        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });
        await recordOutbox({
            scriptId,
            opType: 'character.gender',
            payloadJson: buildCharacterGenderPayload(scriptId, characterId, normalizedGenderKey, now),
        });

        return dbQueries.getScriptCharacterById(db, {
            scriptId,
            characterId,
        });
    };

    const upsertScriptCharacterGender: CharacterHandlers['upsertScriptCharacterGender'] = async (
        scriptId,
        label,
    ) => {
        const normalizedLabel = normalizeGenderLabel(label);
        const genderKey = normalizeGenderKey(normalizedLabel);

        if (!genderKey) {
            return null;
        }

        const db = await getDb();
        const now = Date.now();

        await dbQueries.upsertScriptCharacterGender(db, {
            id: uuidv7(),
            scriptId,
            genderKey,
            genderLabel: normalizedLabel,
            createdAt: now,
            updatedAt: now,
        });

        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });

        await recordOutbox({
            scriptId,
            opType: 'character.gender.upsert',
            payloadJson: buildCharacterGenderUpsertPayload(scriptId, genderKey, normalizedLabel, now),
        });

        return dbQueries.getScriptCharacterGenderByKey(db, {
            scriptId,
            genderKey,
        });
    };

    return {
        listScriptCharacterGenders,
        setScriptCharacterGender,
        upsertScriptCharacterGender,
    };
};
