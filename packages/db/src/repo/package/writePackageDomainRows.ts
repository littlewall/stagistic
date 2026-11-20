import {buildScriptSummaryMetadata} from '@stagistic/script';
import {requireValue} from '@stagistic/shared';
import {eq} from 'drizzle-orm';

import type {DbClient} from '../../queries';
import * as dbQueries from '../../queries';
import {scriptSceneCharacters, scriptScenes} from '../../schema';
import type {ScriptPackageWrite} from '../../types/scriptPackageWrite';
import {writeScriptSettingsTx} from '../config/config';
import {setScriptFormatTemplateId} from '../config/formatTemplate';
import {writeTitlePageFieldsTx} from '../config/titlePage';
import {LEGACY_TO_BLOCKS_TRIGGERS, migrateScriptDocumentToBlocks} from '../document/migration/legacyToBlocks';

export const writePackageDomainRowsTx = async (
    tx: DbClient,
    scriptId: string,
    input: ScriptPackageWrite,
    storageKeyByAttachment: Map<string, string>,
    now: number,
): Promise<void> => {
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
    await dbQueries.updateScriptSummaryMetadata(tx, {
        scriptId,
        updatedAt: now,
        summaryMetadata: buildScriptSummaryMetadata(input.document),
    });
    await dbQueries.bulkInsertScriptCommentThreads(
        tx,
        input.comments.threads.map(thread => ({...thread, scriptId})),
    );
    await dbQueries.bulkInsertScriptCommentMessages(
        tx,
        input.comments.messages.map(message => ({...message, scriptId})),
    );

    const projectedScenes = await tx
        .select({id: scriptScenes.id, headingBlockId: scriptScenes.headingBlockId})
        .from(scriptScenes)
        .where(eq(scriptScenes.scriptId, scriptId));
    const sceneIdByHeading = new Map(projectedScenes.filter(scene => scene.headingBlockId).map(scene => [scene.headingBlockId as string, scene.id]));

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
        await dbQueries.replaceScriptSceneLocations(tx, {
            scriptId,
            sceneHeadingBlockId: scene.headingBlockId,
            locationIds: scene.locationIds,
        });
    }

    const characterIds = new Set(input.characters.map(character => character.id));
    const sceneCharacters = input.sceneCharacters.filter(row => sceneIdByHeading.has(row.headingBlockId) && characterIds.has(row.characterId));

    if (sceneCharacters.length) await tx.insert(scriptSceneCharacters).values(sceneCharacters.map(row => ({...row, scriptId})));

    await writeTitlePageFieldsTx(tx, scriptId, input.titlePage, now);
    await writeScriptSettingsTx(tx, scriptId, input.settings, now);
    await setScriptFormatTemplateId(tx, scriptId, input.script.formatTemplateId ?? null, now);

    for (const attachment of input.attachments) {
        await dbQueries.insertAttachment(tx, {
            id: attachment.id,
            scriptId,
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            storageKey: requireValue(storageKeyByAttachment.get(attachment.id)),
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
};

