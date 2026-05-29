import {normalizeCharacterKey} from '@stagistic/script';
import {uuidv7} from '@stagistic/shared';

import * as dbQueries from '../../queries';
import type {CharacterMutationDeps} from './mutationDeps';
import {
    buildCharacterColorPayload,
    buildCharacterConfirmPayload,
    buildCharacterDeletePayload,
    buildCharacterRenamePayload,
} from './outboxPayloads';
import type {CharacterHandlers} from './types';

export const createCoreCharacterMutations = ({
    getDb,
    recordOutbox,
}: CharacterMutationDeps): Pick<
    CharacterHandlers,
    'confirmScriptCharacter' | 'deleteScriptCharacter' | 'renameScriptCharacter' | 'setScriptCharacterColor'
> => {
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
            payloadJson: buildCharacterConfirmPayload(scriptId, normalizedKey, now),
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
            payloadJson: buildCharacterDeletePayload(scriptId, characterId, currentCharacter.key, now),
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
                payloadJson: buildCharacterRenamePayload(
                    scriptId,
                    currentCharacter.id,
                    currentCharacter.key,
                    normalizedNextKey,
                    now,
                ),
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
            payloadJson: buildCharacterRenamePayload(
                scriptId,
                currentCharacter.id,
                currentCharacter.key,
                normalizedNextKey,
                now,
            ),
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
            payloadJson: buildCharacterColorPayload(scriptId, characterId, colorHex, now),
        });

        return dbQueries.getScriptCharacterById(db, {
            scriptId,
            characterId,
        });
    };

    return {
        confirmScriptCharacter,
        deleteScriptCharacter,
        renameScriptCharacter,
        setScriptCharacterColor,
    };
};
