import {dbQueries} from '@stagistic/db';
import {normalizeCharacterKey} from '@stagistic/script-core';
import {
    collapseWhitespace,
    uuidv7,
} from '@stagistic/shared';
import type {ScriptRepository} from '@stagistic/sync-core';

import type {
    GetDb,
    RecordOutbox,
} from './types';

type CharacterHandlers = Pick<
    ScriptRepository,
    | 'listScriptCharacterGenders'
    | 'confirmScriptCharacter'
    | 'deleteScriptCharacter'
    | 'renameScriptCharacter'
    | 'setScriptCharacterColor'
    | 'setScriptCharacterGender'
    | 'upsertScriptCharacterGender'
>;

type CreateCharacterHandlersArgs = {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
};

export const createCharacterHandlers = ({
    getDb,
    recordOutbox,
}: CreateCharacterHandlersArgs): CharacterHandlers => {
    const defaultGenderLabelByKey = new Map<string, string>([
        [
            'male',
            'Male',
        ],
        [
            'female',
            'Female',
        ],
    ]);
    const normalizeGenderLabel = (label: string) => collapseWhitespace(label);
    const normalizeGenderKey = (label: string) => normalizeGenderLabel(label).toLocaleLowerCase();

    const listScriptCharacterGenders: CharacterHandlers['listScriptCharacterGenders'] = async scriptId => {
        const db = await getDb();

        return dbQueries.listScriptCharacterGenders(db, scriptId);
    };

    const confirmScriptCharacter: CharacterHandlers['confirmScriptCharacter'] = async (
        scriptId,
        characterKey,
    ) => {
        const normalizedKey = normalizeCharacterKey(characterKey);

        if (!normalizedKey) {
            return null;
        }

        const db = await getDb();
        const now = Date.now();

        await dbQueries.upsertScriptCharacter(db, {
            id: uuidv7(),
            scriptId,
            characterKey: normalizedKey,
            createdAt: now,
            updatedAt: now,
        });

        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });

        await recordOutbox({
            scriptId,
            opType: 'character.confirm',
            payloadJson: JSON.stringify({
                scriptId,
                characterKey: normalizedKey,
                confirmedAt: now,
            }),
        });

        return dbQueries.getScriptCharacterByKey(db, {
            scriptId,
            characterKey: normalizedKey,
        });
    };

    const deleteScriptCharacter: CharacterHandlers['deleteScriptCharacter'] = async (scriptId, characterId) => {
        if (!characterId) {
            return;
        }

        const db = await getDb();
        const now = Date.now();
        const currentCharacter = await dbQueries.getScriptCharacterById(db, {
            scriptId,
            characterId,
        });

        if (!currentCharacter) {
            return;
        }

        await dbQueries.deleteScriptCharacter(db, {
            scriptId,
            characterId,
        });

        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });

        await recordOutbox({
            scriptId,
            opType: 'character.delete',
            payloadJson: JSON.stringify({
                scriptId,
                characterId,
                characterKey: currentCharacter.key,
                deletedAt: now,
            }),
        });
    };

    const renameScriptCharacter: CharacterHandlers['renameScriptCharacter'] = async (
        scriptId,
        characterId,
        nextCharacterKey,
    ) => {
        const normalizedNextKey = normalizeCharacterKey(nextCharacterKey);

        if (!characterId || !normalizedNextKey) {
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

        if (currentCharacter.key === normalizedNextKey) {
            return currentCharacter;
        }

        const existingTarget = await dbQueries.getScriptCharacterByKey(db, {
            scriptId,
            characterKey: normalizedNextKey,
        });

        if (existingTarget && existingTarget.id !== currentCharacter.id) {
            await dbQueries.touchScriptCharacter(db, {
                scriptId,
                characterId: existingTarget.id,
                updatedAt: now,
            });

            await dbQueries.deleteScriptCharacter(db, {
                scriptId,
                characterId: currentCharacter.id,
            });

            await dbQueries.updateScriptTimestamp(db, {
                scriptId,
                updatedAt: now,
            });

            await recordOutbox({
                scriptId,
                opType: 'character.rename',
                payloadJson: JSON.stringify({
                    scriptId,
                    characterId: currentCharacter.id,
                    previousCharacterKey: currentCharacter.key,
                    nextCharacterKey: normalizedNextKey,
                    renamedAt: now,
                }),
            });

            return dbQueries.getScriptCharacterByKey(db, {
                scriptId,
                characterKey: normalizedNextKey,
            });
        }

        await dbQueries.updateScriptCharacterKey(db, {
            scriptId,
            characterId: currentCharacter.id,
            characterKey: normalizedNextKey,
            updatedAt: now,
        });

        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });

        await recordOutbox({
            scriptId,
            opType: 'character.rename',
            payloadJson: JSON.stringify({
                scriptId,
                characterId: currentCharacter.id,
                previousCharacterKey: currentCharacter.key,
                nextCharacterKey: normalizedNextKey,
                renamedAt: now,
            }),
        });

        return dbQueries.getScriptCharacterByKey(db, {
            scriptId,
            characterKey: normalizedNextKey,
        });
    };

    const setScriptCharacterColor: CharacterHandlers['setScriptCharacterColor'] = async (
        scriptId,
        characterId,
        colorHex,
    ) => {
        if (!characterId) {
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

        await dbQueries.updateScriptCharacterColor(db, {
            scriptId,
            characterId,
            colorHex,
            updatedAt: now,
        });
        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });
        await recordOutbox({
            scriptId,
            opType: 'character.color',
            payloadJson: JSON.stringify({
                scriptId,
                characterId,
                colorHex,
                updatedAt: now,
            }),
        });

        return dbQueries.getScriptCharacterById(db, {
            scriptId,
            characterId,
        });
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
                const defaultGenderLabel = defaultGenderLabelByKey.get(normalizedGenderKey);

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
            payloadJson: JSON.stringify({
                scriptId,
                characterId,
                genderKey: normalizedGenderKey,
                updatedAt: now,
            }),
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
            payloadJson: JSON.stringify({
                scriptId,
                genderKey,
                genderLabel: normalizedLabel,
                updatedAt: now,
            }),
        });

        return dbQueries.getScriptCharacterGenderByKey(db, {
            scriptId,
            genderKey,
        });
    };

    return {
        listScriptCharacterGenders,
        confirmScriptCharacter,
        deleteScriptCharacter,
        renameScriptCharacter,
        setScriptCharacterColor,
        setScriptCharacterGender,
        upsertScriptCharacterGender,
    };
};
