import {
    and,
    asc,
    eq,
    exists,
    not,
    sql,
} from 'drizzle-orm';

import {
    scriptDetachedScenes,
    scriptSceneCharacters,
    scriptScenes,
} from '../../schema';
import type {ScriptSceneCharacter} from '../../types/sceneMetadata';
import type {DbClient} from '../types';

const activeHeading = (db: DbClient) => exists(db.select({id: sql`1`}).from(scriptScenes).where(and(
    eq(scriptScenes.scriptId, scriptSceneCharacters.scriptId),
    eq(scriptScenes.headingBlockId, scriptSceneCharacters.headingBlockId),
)));

export const listSceneCharacters = (db: DbClient, scriptId: string): Promise<ScriptSceneCharacter[]> => db.select().from(scriptSceneCharacters)
    .where(and(eq(scriptSceneCharacters.scriptId, scriptId), activeHeading(db)))
    .orderBy(asc(scriptSceneCharacters.createdAt), asc(scriptSceneCharacters.headingBlockId), asc(scriptSceneCharacters.characterId));

export const sceneCharacterKey = (scriptId: string, headingBlockId: string, characterId: string) => and(
    eq(scriptSceneCharacters.scriptId, scriptId),
    eq(scriptSceneCharacters.headingBlockId, headingBlockId),
    eq(scriptSceneCharacters.characterId, characterId),
);

export const purgeInactiveSceneMetadata = async (db: DbClient, scriptId: string) => {
    await db.delete(scriptSceneCharacters).where(and(eq(scriptSceneCharacters.scriptId, scriptId), not(activeHeading(db))));
    await db.delete(scriptDetachedScenes).where(eq(scriptDetachedScenes.scriptId, scriptId));
};

export const listSceneSynopses = async (db: DbClient, scriptId: string) => {
    const scenes = await db.select({headingBlockId: scriptScenes.headingBlockId, synopsis: scriptScenes.synopsis})
        .from(scriptScenes).where(eq(scriptScenes.scriptId, scriptId))
        .orderBy(asc(scriptScenes.id));

    return scenes.flatMap(scene => (scene.headingBlockId ? [{...scene, headingBlockId: scene.headingBlockId}] : []));
};
