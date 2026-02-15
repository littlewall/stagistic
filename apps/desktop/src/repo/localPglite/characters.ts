import {dbQueries} from '@stagistic/db';
import {normalizeCharacterKey} from '@stagistic/script-core';
import {uuidv7} from '@stagistic/shared';
import type {ScriptRepository} from '@stagistic/sync-core';

import type {
    GetDb,
    RecordOutbox,
} from './types';

type CharacterHandlers = Pick<
    ScriptRepository,
    'confirmScriptCharacter' | 'deleteScriptCharacter' | 'renameScriptCharacter'
>;

type CreateCharacterHandlersArgs = {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
};

export const createCharacterHandlers = ({
    getDb,
    recordOutbox,
}: CreateCharacterHandlersArgs): CharacterHandlers => {
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

    return {
        confirmScriptCharacter,
        deleteScriptCharacter,
        renameScriptCharacter,
    };
};
