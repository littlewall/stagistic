import {type ScriptDocument} from '@stagistic/script';
import {eq} from 'drizzle-orm';

import {extractScriptBlocks} from '../../blocks';
import * as dbQueries from '../../queries';
import {type DbClient, generateBlockOrderKeys} from '../../queries';
import {
    scriptBlocks,
    scriptMusic,
} from '../../schema';
import {toCharacterRefRows} from '../characters/characterRefRows';
import type {SaveScriptDocumentOptions} from './documentProjection';
import {reconcileActsAndScenes} from './persist/reconcileActsAndScenes';

export interface RebuildScriptProjectionArgs extends SaveScriptDocumentOptions {
    db: DbClient,
    scriptId: string,
    document: ScriptDocument,
}

export const rebuildScriptProjection = async ({
    db,
    scriptId,
    document,
    afterPersist,
}: RebuildScriptProjectionArgs): Promise<void> => {
    const now = Date.now();
    const extracted = extractScriptBlocks(scriptId, document);
    const orderKeys = generateBlockOrderKeys(extracted.blocks.length);
    const orderKeyById = new Map(extracted.blocks.map((block, index) => [block.blockId, orderKeys[index]]));
    const sceneIdByHeading = new Map(extracted.scenes.map(scene => [scene.headingBlockId, scene.id]));
    const actIdByHeading = new Map(extracted.acts.map(act => [act.headingBlockId, act.id]));

    await db.transaction(async tx => {
        const existingBlocks = await tx.select({id: scriptBlocks.id}).from(scriptBlocks).where(eq(scriptBlocks.scriptId, scriptId));
        const existingMusic = await tx.select({id: scriptMusic.id}).from(scriptMusic).where(eq(scriptMusic.scriptId, scriptId));
        const knownSpeakingEntities = await dbQueries.listScriptSpeakingEntities(tx, scriptId);

        await reconcileActsAndScenes(tx, scriptId, extracted, now);

        const nextBlockIds = new Set(extracted.blocks.map(block => block.blockId));

        await dbQueries.bulkDeleteScriptBlocks(
            tx,
            existingBlocks.filter(block => !nextBlockIds.has(block.id)).map(block => block.id),
        );
        await dbQueries.bulkUpsertScriptBlocks(
            tx,
            extracted.blocks.map(block => ({
                id: block.blockId,
                scriptId,
                blockType: block.blockType,
                blockOrder: orderKeyById.get(block.blockId) ?? '',
                textContent: block.textContent,
                contentJson: block.contentJson,
                sceneId: block.sceneHeadingBlockId ? sceneIdByHeading.get(block.sceneHeadingBlockId) ?? null : null,
                actId: block.actHeadingBlockId ? actIdByHeading.get(block.actHeadingBlockId) ?? null : null,
                createdAt: now,
                updatedAt: now,
            })),
        );

        const knownCharacterIds = new Set(knownSpeakingEntities.map(entity => entity.id));

        await dbQueries.bulkReplaceScriptBlockCharacterRefs(
            tx,
            extracted.blocks.map(block => ({
                blockId: block.blockId,
                rows: toCharacterRefRows(block, knownCharacterIds),
            })),
        );

        const nextMusicIds = new Set(extracted.music.map(music => music.id));

        await dbQueries.bulkUpsertScriptMusic(
            tx,
            extracted.music.map(music => ({
                id: music.id,
                scriptId,
                sceneNumber: music.sceneNumber,
                indexInScene: music.indexInScene,
                mode: music.mode,
                title: music.title,
                kind: music.kind,
                startBlockId: music.startBlockId,
                endBlockId: music.endBlockId,
                createdAt: now,
                updatedAt: now,
            })),
        );
        await dbQueries.bulkUnassignScriptMusic(
            tx,
            existingMusic.filter(music => !nextMusicIds.has(music.id)).map(music => music.id),
            now,
        );

        if (afterPersist) {
            await afterPersist(tx, true);
        }
    });
};
