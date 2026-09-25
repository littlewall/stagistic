import {asc, eq, inArray} from 'drizzle-orm';

import * as dbQueries from '../queries';
import {
    scriptAttachments,
    scriptCharacterGenders,
    scriptCharacterGroupMembers,
    scriptCharacters,
    scriptCommentMessages,
    scriptCommentThreads,
    scriptLocations,
    scriptMusic,
    scriptMusicAttachments,
    scriptSceneLocations,
    scriptScenes,
} from '../schema';
import type {ScriptPackageSource} from '../scriptPackageSource';
import {readScriptSettings} from './config';
import {loadScriptDocumentFromProjection} from './documentProjection';
import {readTitlePageSettings} from './titlePage';
import type {GetDb} from './types';

export const createReadScriptPackageSource =
    ({getDb}: {getDb: GetDb}) =>
    async (scriptId: string): Promise<ScriptPackageSource | null> => {
        const db = await getDb();
        return db.transaction(async tx => {
            const script = await dbQueries.getScriptSummary(tx, scriptId);
            if (!script) return null;
            const [
                loadedDocument,
                titlePage,
                settings,
                characters,
                ,
                characterGenders,
                music,
                locations,
                scenes,
                ,
                attachments,
                ,
                commentThreads,
                commentMessages,
            ] = await Promise.all([
                loadScriptDocumentFromProjection(tx, scriptId),
                readTitlePageSettings(tx, scriptId),
                readScriptSettings(tx, scriptId),
                tx.select().from(scriptCharacters).where(eq(scriptCharacters.scriptId, scriptId)).orderBy(asc(scriptCharacters.characterKey)),
                Promise.resolve([]),
                tx.select().from(scriptCharacterGenders).where(eq(scriptCharacterGenders.scriptId, scriptId)).orderBy(asc(scriptCharacterGenders.genderKey)),
                tx.select().from(scriptMusic).where(eq(scriptMusic.scriptId, scriptId)).orderBy(asc(scriptMusic.sceneNumber), asc(scriptMusic.indexInScene)),
                tx.select().from(scriptLocations).where(eq(scriptLocations.scriptId, scriptId)).orderBy(asc(scriptLocations.name)),
                tx.select().from(scriptScenes).where(eq(scriptScenes.scriptId, scriptId)).orderBy(asc(scriptScenes.sceneNumber)),
                Promise.resolve([]),
                tx.select().from(scriptAttachments).where(eq(scriptAttachments.scriptId, scriptId)).orderBy(asc(scriptAttachments.createdAt)),
                Promise.resolve([]),
                tx
                    .select()
                    .from(scriptCommentThreads)
                    .where(eq(scriptCommentThreads.scriptId, scriptId))
                    .orderBy(asc(scriptCommentThreads.createdAt), asc(scriptCommentThreads.id)),
                tx
                    .select()
                    .from(scriptCommentMessages)
                    .where(eq(scriptCommentMessages.scriptId, scriptId))
                    .orderBy(asc(scriptCommentMessages.threadId), asc(scriptCommentMessages.createdAt), asc(scriptCommentMessages.id)),
            ]);
            if (!loadedDocument) return null;
            const groupIds = characters.filter(character => character.kind === 'group').map(character => character.id);
            const [members, locationsByScene, attachmentsByMusic] = await Promise.all([
                groupIds.length === 0
                    ? []
                    : tx
                          .select({groupId: scriptCharacterGroupMembers.groupId, characterId: scriptCharacterGroupMembers.characterId})
                          .from(scriptCharacterGroupMembers)
                          .where(inArray(scriptCharacterGroupMembers.groupId, groupIds))
                          .orderBy(asc(scriptCharacterGroupMembers.groupId), asc(scriptCharacterGroupMembers.characterId)),
                scenes.length === 0
                    ? []
                    : tx
                          .select()
                          .from(scriptSceneLocations)
                          .where(
                              inArray(
                                  scriptSceneLocations.sceneId,
                                  scenes.map(scene => scene.id),
                              ),
                          )
                          .orderBy(asc(scriptSceneLocations.sceneId), asc(scriptSceneLocations.locationId)),
                music.length === 0
                    ? []
                    : tx
                          .select()
                          .from(scriptMusicAttachments)
                          .where(
                              inArray(
                                  scriptMusicAttachments.musicId,
                                  music.map(item => item.id),
                              ),
                          )
                          .orderBy(asc(scriptMusicAttachments.musicId), asc(scriptMusicAttachments.role)),
            ]);
            return {
                script,
                document: loadedDocument.document,
                titlePage: titlePage ?? {},
                settings: settings ?? {},
                characters,
                characterGroupMembers: members,
                characterGenders,
                music,
                locations,
                scenes,
                sceneLocations: locationsByScene,
                attachments,
                musicAttachmentBindings: attachmentsByMusic,
                comments: {threads: commentThreads, messages: commentMessages},
            };
        });
    };
