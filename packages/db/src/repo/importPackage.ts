import {eq} from 'drizzle-orm';

import type {FileStorage} from '../fileStorage';
import * as dbQueries from '../queries';
import {scriptScenes} from '../schema';
import type {ScriptPackageWrite} from '../scriptPackageWrite';
import {writeScriptSettingsTx} from './config';
import {LEGACY_TO_BLOCKS_TRIGGERS, migrateScriptDocumentToBlocks} from './migration/legacyToBlocks';
import {writeTitlePageFieldsTx} from './titlePage';
import type {GetDb, RecordOutbox, SyncDb} from './types';

interface CreateImportPackageHandlerArgs {
    getDb: GetDb;
    recordOutbox: RecordOutbox;
    syncDb: SyncDb;
    fileStorage: FileStorage;
}

export const createImportPackageHandler = ({getDb, recordOutbox, syncDb, fileStorage}: CreateImportPackageHandlerArgs) => {
    const createScriptFromPackage = async (input: ScriptPackageWrite): Promise<void> => {
        const db = await getDb();
        const scriptId = input.script.id;
        const now = input.script.updatedAt;

        const storageKeyByAttachment = new Map<string, string>();
        const savedKeys: string[] = [];

        try {
            for (const attachment of input.attachments) {
                const key = await fileStorage.save(attachment.blob);
                storageKeyByAttachment.set(attachment.id, key);
                savedKeys.push(key);
            }

            await db.transaction(async tx => {
                await dbQueries.insertScript(tx, {
                    id: scriptId,
                    title: input.script.title,
                    createdAt: input.script.createdAt,
                    updatedAt: input.script.updatedAt,
                });
                if (input.script.subtitle) {
                    await dbQueries.updateScriptSubtitle(tx, {id: scriptId, subtitle: input.script.subtitle, updatedAt: now});
                }

                await dbQueries.insertScriptCharacterGenders(
                    tx,
                    input.genders.map(gender => ({
                        id: gender.id,
                        scriptId,
                        genderKey: gender.key,
                        genderLabel: gender.label,
                        createdAt: gender.createdAt,
                        updatedAt: gender.updatedAt,
                    })),
                );
                await dbQueries.insertScriptCharacters(
                    tx,
                    input.characters.map(character => ({
                        id: character.id,
                        scriptId,
                        characterKey: character.key,
                        kind: 'character',
                        colorHex: character.colorHex,
                        genderKey: character.genderKey,
                        notes: character.notes,
                        backstory: character.backstory,
                        outline: character.outline,
                        voiceType: character.voiceType,
                        vocalRangeLow: character.vocalRangeLow,
                        vocalRangeHigh: character.vocalRangeHigh,
                        createdAt: character.createdAt,
                        updatedAt: character.updatedAt,
                    })),
                );
                await dbQueries.insertScriptCharacters(
                    tx,
                    input.groups.map(group => ({
                        id: group.id,
                        scriptId,
                        characterKey: group.key,
                        kind: 'group',
                        colorHex: group.colorHex,
                        genderKey: null,
                        notes: null,
                        backstory: null,
                        outline: null,
                        voiceType: null,
                        vocalRangeLow: null,
                        vocalRangeHigh: null,
                        createdAt: group.createdAt,
                        updatedAt: group.updatedAt,
                    })),
                );
                await dbQueries.insertScriptCharacterGroupMembers(
                    tx,
                    input.groups.flatMap(group => group.memberIds.map(characterId => ({groupId: group.id, characterId}))),
                );

                await dbQueries.insertScriptLocations(
                    tx,
                    input.locations.map(location => ({
                        id: location.id,
                        scriptId,
                        name: location.name,
                        description: location.description,
                        createdAt: location.createdAt,
                        updatedAt: location.updatedAt,
                    })),
                );

                for (const item of input.music) {
                    await dbQueries.insertScriptMusic(tx, {
                        id: item.id,
                        scriptId,
                        sceneNumber: item.sceneNumber,
                        indexInScene: item.indexInScene,
                        mode: item.mode,
                        title: item.title,
                        kind: item.kind,
                        startBlockId: item.startBlockId,
                        endBlockId: item.endBlockId,
                        createdAt: item.createdAt,
                        updatedAt: item.updatedAt,
                    });
                }

                await migrateScriptDocumentToBlocks({
                    db: tx,
                    scriptId,
                    sourceDocument: input.document,
                    trigger: LEGACY_TO_BLOCKS_TRIGGERS.createScript,
                    context: LEGACY_TO_BLOCKS_TRIGGERS.createScript,
                });

                const projectedScenes = await tx
                    .select({id: scriptScenes.id, headingBlockId: scriptScenes.headingBlockId})
                    .from(scriptScenes)
                    .where(eq(scriptScenes.scriptId, scriptId));
                const sceneIdByHeading = new Map(
                    projectedScenes.filter(scene => scene.headingBlockId).map(scene => [scene.headingBlockId as string, scene.id]),
                );

                for (const scene of input.scenes) {
                    if (!scene.headingBlockId) continue;
                    const projectedSceneId = sceneIdByHeading.get(scene.headingBlockId);
                    if (!projectedSceneId) continue;
                    await dbQueries.updateScriptSceneMetadata(tx, {
                        sceneId: projectedSceneId,
                        colorHex: scene.colorHex,
                        synopsis: scene.synopsis,
                        updatedAt: now,
                    });
                    await dbQueries.replaceScriptSceneLocations(tx, {scriptId, sceneHeadingBlockId: scene.headingBlockId, locationIds: scene.locationIds});
                }

                await writeTitlePageFieldsTx(tx, scriptId, input.titlePage, now);
                await writeScriptSettingsTx(tx, scriptId, input.settings, now);

                for (const attachment of input.attachments) {
                    await dbQueries.insertAttachment(tx, {
                        id: attachment.id,
                        scriptId,
                        filename: attachment.filename,
                        mimeType: attachment.mimeType,
                        sizeBytes: attachment.sizeBytes,
                        storageKey: storageKeyByAttachment.get(attachment.id)!,
                        createdAt: attachment.createdAt,
                        updatedAt: attachment.updatedAt,
                    });
                }
                for (const binding of input.bindings) {
                    await dbQueries.insertMusicAttachmentLink(tx, {
                        musicId: binding.musicId,
                        attachmentId: binding.attachmentId,
                        role: binding.role,
                        sortOrder: binding.sortOrder,
                        createdAt: binding.createdAt,
                    });
                }

                await recordOutbox(
                    {
                        scriptId,
                        entityKey: `script:${scriptId}`,
                        opType: 'script.import',
                        occurredAt: now,
                        payloadJson: JSON.stringify({scriptId, createdAt: input.script.createdAt}),
                    },
                    tx,
                );
            });
        } catch (error) {
            await Promise.all(
                savedKeys.map(key =>
                    fileStorage.delete(key).catch(() => {
                        console.error('[import] Failed to clean up an uncommitted blob.');
                    }),
                ),
            );
            throw error;
        }

        await syncDb();
    };

    return {createScriptFromPackage};
};
