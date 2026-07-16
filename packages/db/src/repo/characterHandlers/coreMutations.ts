import {normalizeCharacterKey} from '@stagistic/script';
import {uuidv7} from '@stagistic/shared';

import type {DbClient} from '../../queries';
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
    syncDb,
}: CharacterMutationDeps): Pick<
    CharacterHandlers,
    | 'confirmScriptCharacter'
    | 'confirmScriptCharacterWithId'
    | 'deleteScriptCharacter'
    | 'renameScriptCharacter'
    | 'setScriptCharacterColor'
> => {
    const confirmScriptCharacterWithId: CharacterHandlers['confirmScriptCharacterWithId'] = async (
        scriptId,
        input,
    ) => {
        const normalizedKey = normalizeCharacterKey(input.key);

        if (!normalizedKey) {
            return null;
        }

        const db = await getDb();
        const now = input.timestamp ?? Date.now();

        await db.transaction(async tx => {
            await dbQueries.upsertScriptCharacter(tx, {
                id: input.id,
                scriptId,
                characterKey: normalizedKey,
                colorHex: input.colorHex,
                createdAt: now,
                updatedAt: now,
            });
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `character:${input.id}`,
                opType: 'character.confirm',
                occurredAt: now,
                payloadJson: buildCharacterConfirmPayload(scriptId, normalizedKey, now),
            }, tx);

            if (input.colorHex !== undefined && input.colorHex !== null) {
                await recordOutbox({
                    scriptId,
                    entityKey: `character:${input.id}`,
                    opType: 'character.color',
                    occurredAt: now,
                    payloadJson: buildCharacterColorPayload(
                        scriptId,
                        input.id,
                        input.colorHex,
                        now,
                    ),
                }, tx);
            }
        });
        await syncDb();

        return dbQueries.getScriptCharacterByKey(db, {
            scriptId,
            characterKey: normalizedKey,
        });
    };
    const confirmScriptCharacter: CharacterHandlers['confirmScriptCharacter'] = (
        scriptId,
        characterKey,
    ) => confirmScriptCharacterWithId(scriptId, {
        id: uuidv7(),
        key: characterKey,
    });

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

        await db.transaction(async tx => {
            await dbQueries.deleteScriptCharacter(tx, {scriptId, characterId});
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `character:${characterId}`,
                opType: 'character.delete',
                occurredAt: now,
                payloadJson: buildCharacterDeletePayload(scriptId, characterId, currentCharacter.key, now),
            }, tx);
        });
        await syncDb();
    };

    const finalizeRename = async (
        db: DbClient,
        scriptId: string,
        currentCharacter: {id: string, key: string},
        normalizedNextKey: string,
        now: number,
    ) => {
        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });

        await recordOutbox({
            scriptId,
            entityKey: `character:${currentCharacter.id}`,
            opType: 'character.rename',
            occurredAt: now,
            payloadJson: buildCharacterRenamePayload(
                scriptId,
                currentCharacter.id,
                currentCharacter.key,
                normalizedNextKey,
                now,
            ),
        }, db);
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

        await db.transaction(async tx => {
            if (existingTarget && existingTarget.id !== currentCharacter.id) {
                await dbQueries.touchScriptCharacter(tx, {
                    scriptId,
                    characterId: existingTarget.id,
                    updatedAt: now,
                });
                await dbQueries.deleteScriptCharacter(tx, {
                    scriptId,
                    characterId: currentCharacter.id,
                });
                await finalizeRename(tx, scriptId, currentCharacter, normalizedNextKey, now);

                return;
            }

            await dbQueries.updateScriptCharacterKey(tx, {
                scriptId,
                characterId: currentCharacter.id,
                characterKey: normalizedNextKey,
                updatedAt: now,
            });
            await finalizeRename(tx, scriptId, currentCharacter, normalizedNextKey, now);
        });
        await syncDb();

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

        await db.transaction(async tx => {
            await dbQueries.updateScriptCharacterColor(tx, {
                scriptId,
                characterId,
                colorHex,
                updatedAt: now,
            });
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `character:${characterId}`,
                opType: 'character.color',
                occurredAt: now,
                payloadJson: buildCharacterColorPayload(scriptId, characterId, colorHex, now),
            }, tx);
        });
        await syncDb();

        return dbQueries.getScriptCharacterById(db, {
            scriptId,
            characterId,
        });
    };

    return {
        confirmScriptCharacter,
        confirmScriptCharacterWithId,
        deleteScriptCharacter,
        renameScriptCharacter,
        setScriptCharacterColor,
    };
};
