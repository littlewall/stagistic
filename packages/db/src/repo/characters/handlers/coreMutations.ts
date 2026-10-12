import {normalizeCharacterKey} from '@stagistic/script';
import {uuidv7} from '@stagistic/shared';

import type {DbClient} from '../../../queries';
import * as dbQueries from '../../../queries';
import type {CharacterMutationDeps} from './mutationDeps';
import type {CharacterHandlers} from './types';
import {createCharacterAttributeUpdater} from './updateCharacterAttribute';

export const createCoreCharacterMutations = ({
    getDb,
    syncDb,
}: CharacterMutationDeps): Pick<
    CharacterHandlers,
    'confirmScriptCharacter' | 'confirmScriptCharacterWithId' | 'deleteScriptCharacter' | 'renameScriptCharacter' | 'setScriptCharacterColor'
> => {
    const updateCharacterAttribute = createCharacterAttributeUpdater({
        getDb,
        syncDb,
    });

    const confirmScriptCharacterWithId: CharacterHandlers['confirmScriptCharacterWithId'] = async (scriptId, input) => {
        const normalizedKey = normalizeCharacterKey(input.key);

        if (!normalizedKey) {
            return null;
        }

        const db = await getDb();
        const now = input.timestamp ?? Date.now();
        let confirmed = false;

        await db.transaction(async tx => {
            const existing = await dbQueries.getScriptSpeakingEntityByKey(tx, {
                scriptId,
                characterKey: normalizedKey,
            });

            if (existing?.kind === 'group') {
                return;
            }

            await dbQueries.upsertScriptCharacter(tx, {
                id: input.id,
                scriptId,
                characterKey: normalizedKey,
                colorHex: input.colorHex,
                createdAt: now,
                updatedAt: now,
            });
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});

            confirmed = true;
        });

        if (!confirmed) {
            return null;
        }

        await syncDb();

        return dbQueries.getScriptCharacterByKey(db, {
            scriptId,
            characterKey: normalizedKey,
        });
    };
    const confirmScriptCharacter: CharacterHandlers['confirmScriptCharacter'] = (scriptId, characterKey) => confirmScriptCharacterWithId(scriptId, {
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
        });
        await syncDb();
    };

    const finalizeRename = async (db: DbClient, scriptId: string, now: number) => {
        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });
    };

    const renameScriptCharacter: CharacterHandlers['renameScriptCharacter'] = async (scriptId, characterId, nextCharacterKey) => {
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

        const existingTarget = await dbQueries.getScriptSpeakingEntityByKey(db, {
            scriptId,
            characterKey: normalizedNextKey,
        });

        if (existingTarget?.kind === 'group') {
            return null;
        }

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
                await finalizeRename(tx, scriptId, now);

                return;
            }

            await dbQueries.updateScriptCharacterKey(tx, {
                scriptId,
                characterId: currentCharacter.id,
                characterKey: normalizedNextKey,
                updatedAt: now,
            });
            await finalizeRename(tx, scriptId, now);
        });
        await syncDb();

        return dbQueries.getScriptCharacterByKey(db, {
            scriptId,
            characterKey: normalizedNextKey,
        });
    };

    const setScriptCharacterColor: CharacterHandlers['setScriptCharacterColor'] = (scriptId, characterId, colorHex) => updateCharacterAttribute(scriptId, characterId, {
        update: (tx, updatedAt) => dbQueries.updateScriptCharacterColor(tx, {
            scriptId,
            characterId,
            colorHex,
            updatedAt,
        }),
    });

    return {
        confirmScriptCharacter,
        confirmScriptCharacterWithId,
        deleteScriptCharacter,
        renameScriptCharacter,
        setScriptCharacterColor,
    };
};
