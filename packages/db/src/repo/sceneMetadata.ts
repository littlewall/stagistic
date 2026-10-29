import {and, eq} from 'drizzle-orm';

import type {DbClient} from '../queries';
import {updateScriptTimestamp} from '../queries';
import {listSceneCharacters, sceneCharacterKey} from '../queries/scripts/sceneCharacters';
import {
    scriptCharacters,
    scriptSceneCharacters,
    scriptScenes,
} from '../schema';
import type {ScriptRepository} from '../types/scriptRepository';
import type {
    GetDb,
    RecordOutbox,
    SyncDb,
} from './types';

type SceneMetadataRepository = Pick<ScriptRepository, 'listSceneCharacters' | 'putSceneCharacter' | 'removeSceneCharacter' | 'updateSceneSynopsis'>;

export const createSceneMetadataHandlers = ({
    getDb,
    recordOutbox,
    syncDb,
}: {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
    syncDb: SyncDb,
}): SceneMetadataRepository => {
    const mutate = async <T>(
        scriptId: string,
        headingBlockId: string,
        opType: string,
        payload: unknown,
        write: (tx: DbClient, now: number) => Promise<T>,
    ): Promise<T> => {
        const db = await getDb();
        const now = Date.now();
        const result = await db.transaction(async tx => {
            const value = await write(tx, now);

            if (value === null || value === false) return value;

            await updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `scene:${headingBlockId}`,
                opType,
                occurredAt: now,
                payloadJson: JSON.stringify({
                    scriptId,
                    headingBlockId,
                    value: payload,
                    updatedAt: now,
                }),
            }, tx);

            return value;
        });

        if (result !== null && result !== false) await syncDb();

        return result;
    };
    const putSceneCharacter: SceneMetadataRepository['putSceneCharacter'] = async (scriptId, headingBlockId, characterId, input) => {
        const arc = input.arcValue;

        if (arc !== undefined && arc !== null && (!Number.isInteger(arc) || arc < -3 || arc > 3)) {
            throw new RangeError('Arc value must be an integer from -3 to 3.');
        }

        return mutate(scriptId, headingBlockId, 'scene.character.put', {characterId, ...input}, async (tx, now) => {
            const [scene] = await tx.select({id: scriptScenes.id}).from(scriptScenes).where(and(
                eq(scriptScenes.scriptId, scriptId),
                eq(scriptScenes.headingBlockId, headingBlockId),
            ));
            const [character] = await tx.select({id: scriptCharacters.id}).from(scriptCharacters).where(and(
                eq(scriptCharacters.scriptId, scriptId),
                eq(scriptCharacters.id, characterId),
                eq(scriptCharacters.kind, 'character'),
            ));

            if (!scene || !character) return null;

            const note = input.note?.trim() || null;
            const [row] = await tx.insert(scriptSceneCharacters).values({
                scriptId,
                headingBlockId,
                characterId,
                note,
                arcValue: arc ?? null,
                createdAt: now,
                updatedAt: now,
            })
                .onConflictDoUpdate({
                    target: [
                        scriptSceneCharacters.scriptId,
                        scriptSceneCharacters.headingBlockId,
                        scriptSceneCharacters.characterId,
                    ],
                    set: {
                        ...input.note !== undefined ? {note} : {},
                        ...arc !== undefined ? {arcValue: arc} : {},
                        updatedAt: now,
                    },
                })
                .returning();

            return row ?? null;
        });
    };
    const removeSceneCharacter: SceneMetadataRepository['removeSceneCharacter'] = async (scriptId, headingBlockId, characterId) => {
        await mutate(scriptId, headingBlockId, 'scene.character.remove', {characterId}, async tx => {
            const deleted = await tx.delete(scriptSceneCharacters).where(sceneCharacterKey(scriptId, headingBlockId, characterId)).returning();

            return deleted.length > 0;
        });
    };
    const updateSceneSynopsis: SceneMetadataRepository['updateSceneSynopsis'] = async (scriptId, headingBlockId, value) => {
        const synopsis = value?.trim() || null;

        return mutate(scriptId, headingBlockId, 'scene.synopsis.update', {synopsis}, async (tx, now) => {
            const rows = await tx.update(scriptScenes).set({synopsis, updatedAt: now}).where(and(
                eq(scriptScenes.scriptId, scriptId),
                eq(scriptScenes.headingBlockId, headingBlockId),
            ))
                .returning({id: scriptScenes.id});

            return rows.length > 0;
        });
    };

    return {
        listSceneCharacters: async scriptId => listSceneCharacters(await getDb(), scriptId),
        putSceneCharacter,
        removeSceneCharacter,
        updateSceneSynopsis,
    };
};
