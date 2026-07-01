import {eq, inArray} from 'drizzle-orm';
import {generateNKeysBetween} from 'fractional-indexing';

import type {DbClient} from '../queries';
import {
    bulkDeleteScriptBlocks,
    bulkUpsertScriptActs,
    bulkUpsertScriptBlocks,
    bulkUpsertScriptScenes,
    deleteScriptAct,
    deleteScriptScene,
    listScriptCharacters,
    replaceScriptTitlePageFields,
} from '../queries';
import {
    scriptActs,
    scriptBlockCharacterRefs,
    scriptBlocks,
    scriptScenes,
} from '../schema';
import {extractScriptBlocks} from './extract';
import {toAudit} from './migrateAudit';
import type {
    ExtractScriptBlocksResult,
    MigrateLegacyJsonToBlocksForScriptOptions,
    PersistExtractedBlocksResult,
    RewriteBlocksMigrationAudit,
    RewriteStoredBlockCharacterRefRow,
} from './types';
import {makeTitlePageFieldId} from './types';

const persistExtractedBlocks = async (
    db: DbClient,
    scriptId: string,
    extracted: ExtractScriptBlocksResult,
    migratedAt: number,
): Promise<PersistExtractedBlocksResult> => {
    const warnings: string[] = [];

    const scriptCharacters = await listScriptCharacters(db, scriptId);
    const existingScenes = await db
        .select()
        .from(scriptScenes)
        .where(eq(scriptScenes.scriptId, scriptId));
    const existingBlocks = await db
        .select({id: scriptBlocks.id})
        .from(scriptBlocks)
        .where(eq(scriptBlocks.scriptId, scriptId));
    const existingActs = await db
        .select({id: scriptActs.id})
        .from(scriptActs)
        .where(eq(scriptActs.scriptId, scriptId));
    const characterIdSet = new Set(scriptCharacters.map(character => character.id));
    const sceneIdByHeadingBlockId = new Map<string, string>();
    const actIdByHeadingBlockId = new Map<string, string>();
    const existingSceneByHeadingBlockId = new Map<string, typeof existingScenes[number]>();

    existingScenes.forEach(scene => {
        if (!scene.headingBlockId) {
            return;
        }

        existingSceneByHeadingBlockId.set(scene.headingBlockId, scene);
    });

    extracted.scenes.forEach(scene => {
        sceneIdByHeadingBlockId.set(scene.headingBlockId, scene.id);
    });

    extracted.acts.forEach(act => {
        actIdByHeadingBlockId.set(act.headingBlockId, act.id);
    });

    const validCharacterRefsByBlockId = new Map<string, RewriteStoredBlockCharacterRefRow[]>();

    extracted.blocks.forEach(block => {
        const refs = Object.entries(block.characterRefByKey)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .reduce<RewriteStoredBlockCharacterRefRow[]>((accumulator, [characterKey, characterId]) => {
                if (!characterIdSet.has(characterId)) {
                    warnings.push(
                        `Script ${scriptId}: block ${block.blockId} has unknown character id ${characterId} for key ${characterKey}.`,
                    );

                    return accumulator;
                }

                accumulator.push({
                    blockId: block.blockId,
                    characterKey,
                    characterId,
                });

                return accumulator;
            }, []);

        validCharacterRefsByBlockId.set(block.blockId, refs);
    });

    const newBlockIds = new Set(extracted.blocks.map(b => b.blockId));
    const newSceneIds = new Set(extracted.scenes.map(s => s.id));
    const newActIds = new Set(extracted.acts.map(a => a.id));
    const orphanBlockIds = existingBlocks.map(b => b.id).filter(id => !newBlockIds.has(id));
    const orphanSceneIds = existingScenes.map(s => s.id).filter(id => !newSceneIds.has(id));
    const orphanActIds = existingActs.map(a => a.id).filter(id => !newActIds.has(id));

    await db.transaction(async tx => {
        await bulkUpsertScriptActs(tx, extracted.acts.map(act => ({
            id: act.id,
            scriptId,
            headingBlockId: act.headingBlockId,
            name: act.name,
            createdAt: migratedAt,
            updatedAt: migratedAt,
        })));

        const scenePayloads = extracted.scenes.map(scene => {
            const existingScene = existingSceneByHeadingBlockId.get(scene.headingBlockId) ?? null;
            const importedSynopsis = extracted.importMetadata.sceneSynopsisByHeadingBlockId.get(scene.headingBlockId);

            return {
                id: scene.id,
                scriptId,
                headingBlockId: scene.headingBlockId,
                sceneNumber: existingScene?.sceneNumber ?? null,
                colorHex: existingScene?.colorHex ?? null,
                synopsis: importedSynopsis ?? existingScene?.synopsis ?? null,
                locationId: existingScene?.locationId ?? null,
                createdAt: existingScene?.createdAt ?? migratedAt,
                updatedAt: migratedAt,
            };
        });

        await bulkUpsertScriptScenes(tx, scenePayloads);

        if (extracted.importMetadata.titlePageFields !== null) {
            await replaceScriptTitlePageFields(
                tx,
                scriptId,
                extracted.importMetadata.titlePageFields.map(field => ({
                    id: makeTitlePageFieldId(scriptId, field.orderNo),
                    fieldKey: field.fieldKey,
                    fieldValue: field.fieldValue,
                    groupNo: null,
                    orderNo: field.orderNo,
                    createdAt: migratedAt,
                    updatedAt: migratedAt,
                })),
            );
        }

        const orderKeys = generateNKeysBetween(null, null, extracted.blocks.length);

        await bulkUpsertScriptBlocks(tx, extracted.blocks.map((block, index) => ({
            id: block.blockId,
            scriptId,
            blockType: block.blockType,
            blockOrder: orderKeys[index],
            textContent: block.textContent,
            contentJson: block.contentJson,
            sceneId: block.sceneHeadingBlockId
                ? sceneIdByHeadingBlockId.get(block.sceneHeadingBlockId) ?? null
                : null,
            actId: block.actHeadingBlockId
                ? actIdByHeadingBlockId.get(block.actHeadingBlockId) ?? null
                : null,
            createdAt: migratedAt,
            updatedAt: migratedAt,
        })));

        const allCharacterRefs = extracted.blocks.flatMap(block => (validCharacterRefsByBlockId.get(block.blockId) ?? []).map(ref => ({
            blockId: block.blockId,
            characterId: ref.characterId,
            characterKey: ref.characterKey,
            isConfirmed: true,
        })));

        if (newBlockIds.size > 0) {
            await tx
                .delete(scriptBlockCharacterRefs)
                .where(inArray(scriptBlockCharacterRefs.blockId, [...newBlockIds]));
        }

        if (allCharacterRefs.length > 0) {
            await tx.insert(scriptBlockCharacterRefs).values(allCharacterRefs);
        }

        /*
         * Delete blocks, scenes and acts that no longer exist in the document.
         * Blocks first: their character refs are cascade-deleted via FK.
         * Scene/act deletion triggers FK set-null on scriptBlocks.sceneId/actId,
         * but those blocks were already upserted with correct references above.
         */
        await bulkDeleteScriptBlocks(tx, orphanBlockIds);

        for (const sceneId of orphanSceneIds) {
            await deleteScriptScene(tx, sceneId);
        }

        for (const actId of orphanActIds) {
            await deleteScriptAct(tx, actId);
        }
    });

    const storedCharacterRefCount = Array.from(validCharacterRefsByBlockId.values())
        .reduce((sum, refs) => {
            return sum + refs.length;
        }, 0);

    return {
        storedBlockCount: extracted.blocks.length,
        storedCharacterRefCount,
        warnings,
    };
};

export const migrateLegacyJsonToBlocksForScript = async (
    db: DbClient,
    scriptId: string,
    options?: MigrateLegacyJsonToBlocksForScriptOptions,
): Promise<RewriteBlocksMigrationAudit> => {
    const trigger = options?.trigger ?? 'manual';
    const migratedAt = Date.now();
    const warnings: string[] = [];
    const sourceDocument = options?.sourceDocument ?? null;

    if (!options?.force) {
        const existingRows = await db
            .select({id: scriptBlocks.id})
            .from(scriptBlocks)
            .where(eq(scriptBlocks.scriptId, scriptId))
            .limit(1);

        if (existingRows.length > 0) {
            return toAudit(
                scriptId,
                trigger,
                migratedAt,
                0,
                0,
                0,
                warnings,
                null,
            );
        }
    }

    if (!sourceDocument || !Array.isArray(sourceDocument.content)) {
        return toAudit(
            scriptId,
            trigger,
            migratedAt,
            0,
            0,
            0,
            warnings,
            `Script ${scriptId}: sourceDocument is required for block migration.`,
        );
    }

    const extracted = extractScriptBlocks(scriptId, sourceDocument);

    warnings.push(...extracted.warnings);

    try {
        const persisted = await persistExtractedBlocks(db, scriptId, extracted, migratedAt);

        warnings.push(...persisted.warnings);

        return toAudit(
            scriptId,
            trigger,
            migratedAt,
            extracted.blocks.length,
            persisted.storedBlockCount,
            persisted.storedCharacterRefCount,
            warnings,
            null,
        );
    } catch (error) {
        return toAudit(
            scriptId,
            trigger,
            migratedAt,
            extracted.blocks.length,
            0,
            0,
            warnings,
            error instanceof Error
                ? error.message
                : String(error),
        );
    }
};
