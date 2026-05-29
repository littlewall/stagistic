import {and, eq} from 'drizzle-orm';

import {
    bulkDeleteScriptBlocks,
    type DbClient,
    deleteScriptAct,
    deleteScriptScene,
    listScriptCharacters,
    replaceScriptBlockCharacterRefs,
    upsertScriptAct,
    upsertScriptScene,
    writeFinalBlockOrders,
} from '../../queries';
import {
    type ExtractedBlockRow,
    extractScriptBlocks,
    type RewriteScriptDocument,
} from '../../rewrite/jsonToBlocks';
import {
    scriptActs, scriptBlocks, scriptScenes,
} from '../../schema';
import {diffExtractedBlocks} from './diffExtractedBlocks';

/*
 * Temp order offset for freshly-inserted rows during a structural write. Larger
 * than any realistic block count, so temp values never collide with surviving
 * rows (0..M) before writeFinalBlockOrders reassigns everything.
 */
const INSERT_TEMP_OFFSET = 1_000_000;

const serializeRefByKey = (refByKey: Record<string, string>): string => {
    return Object.entries(refByKey)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, id]) => `${key}:${id}`)
        .join('|');
};

const nonOrderFieldsDiffer = (prev: ExtractedBlockRow | undefined, next: ExtractedBlockRow): boolean => {
    if (!prev) {
        return true;
    }

    return prev.blockType !== next.blockType
        || prev.textContent !== next.textContent
        || prev.contentJson !== next.contentJson
        || prev.sceneHeadingBlockId !== next.sceneHeadingBlockId
        || prev.actHeadingBlockId !== next.actHeadingBlockId
        || prev.columnGroupId !== next.columnGroupId
        || prev.columnIndex !== next.columnIndex;
};

const refsDiffer = (prev: ExtractedBlockRow | undefined, next: ExtractedBlockRow): boolean => {
    if (!prev) {
        return true;
    }

    return serializeRefByKey(prev.characterRefByKey) !== serializeRefByKey(next.characterRefByKey);
};

const toCharacterRefRows = (block: ExtractedBlockRow, knownCharacterIds: Set<string>) => {
    return Object.entries(block.characterRefByKey)
        .filter(([, characterId]) => knownCharacterIds.has(characterId))
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([characterKey, characterId]) => ({
            characterId, characterKey, isConfirmed: true,
        }));
};

/**
 * Stateful per-script persister. Holds the last-saved extracted blocks as the
 * diff baseline. Create one per loaded script. `persist` writes only the delta
 * and is safe to call repeatedly.
 */
export const createDocumentPersister = (scriptId: string) => {
    let lastSavedBlocks = new Map<string, ExtractedBlockRow>();

    const setBaseline = (blocks: ExtractedBlockRow[]) => {
        lastSavedBlocks = new Map(blocks.map(block => [block.blockId, block]));
    };

    const persist = async (db: DbClient, document: RewriteScriptDocument): Promise<void> => {
        const now = Date.now();
        const extracted = extractScriptBlocks(scriptId, document);
        const diff = diffExtractedBlocks(Array.from(lastSavedBlocks.values()), extracted.blocks);

        if (diff.inserted.length === 0 && diff.updated.length === 0 && diff.deletedIds.length === 0) {
            return;
        }

        const characters = await listScriptCharacters(db, scriptId);
        const knownCharacterIds = new Set(characters.map(character => character.id));

        const sceneIdByHeading = new Map(extracted.scenes.map(scene => [scene.headingBlockId, scene.id]));
        const actIdByHeading = new Map(extracted.acts.map(act => [act.headingBlockId, act.id]));

        const toDbBlock = (block: ExtractedBlockRow) => ({
            id: block.blockId,
            scriptId,
            blockType: block.blockType,
            blockOrder: block.orderNo,
            textContent: block.textContent,
            contentJson: block.contentJson,
            sceneId: block.sceneHeadingBlockId ? sceneIdByHeading.get(block.sceneHeadingBlockId) ?? null : null,
            actId: block.actHeadingBlockId ? actIdByHeading.get(block.actHeadingBlockId) ?? null : null,
            columnGroupId: block.columnGroupId,
            columnIndex: block.columnIndex,
            createdAt: now,
            updatedAt: now,
        });

        const updateBlockFields = async (tx: DbClient, block: ExtractedBlockRow) => {
            const row = toDbBlock(block);

            await tx
                .update(scriptBlocks)
                .set({
                    blockType: row.blockType,
                    textContent: row.textContent,
                    contentJson: row.contentJson,
                    sceneId: row.sceneId,
                    actId: row.actId,
                    updatedAt: now,
                })
                .where(and(eq(scriptBlocks.scriptId, scriptId), eq(scriptBlocks.id, row.id)));
        };

        const fieldChangedUpdated = diff.updated.filter(
            block => nonOrderFieldsDiffer(lastSavedBlocks.get(block.blockId), block),
        );
        const refChangedUpdated = diff.updated.filter(
            block => refsDiffer(lastSavedBlocks.get(block.blockId), block),
        );

        await db.transaction(async tx => {
            if (!diff.structural) {
                // Case A: content-only edits — touch only blocks whose fields/refs actually changed.
                for (const block of fieldChangedUpdated) {
                    await updateBlockFields(tx, block);
                }

                for (const block of refChangedUpdated) {
                    await replaceScriptBlockCharacterRefs(tx, block.blockId, toCharacterRefRows(block, knownCharacterIds));
                }

                return;
            }

            /*
             * Case B: structural change (insert/delete/reorder/heading edit).
             * 1. Reconcile acts.
             */
            const existingActs = await tx.select({id: scriptActs.id}).from(scriptActs).where(eq(scriptActs.scriptId, scriptId));
            const nextActIds = new Set(extracted.acts.map(act => act.id));

            for (const act of extracted.acts) {
                await upsertScriptAct(tx, {
                    id: act.id,
                    scriptId,
                    headingBlockId: act.headingBlockId,
                    name: act.name,
                    createdAt: now,
                    updatedAt: now,
                });
            }

            for (const act of existingActs) {
                if (!nextActIds.has(act.id)) {
                    await deleteScriptAct(tx, act.id);
                }
            }

            // 2. Reconcile scenes (preserve existing metadata).
            const existingScenes = await tx.select().from(scriptScenes).where(eq(scriptScenes.scriptId, scriptId));
            const existingSceneByHeading = new Map(
                existingScenes
                    .filter(scene => scene.headingBlockId)
                    .map(scene => [scene.headingBlockId as string, scene] as const),
            );
            const nextSceneIds = new Set(extracted.scenes.map(scene => scene.id));

            for (const scene of extracted.scenes) {
                const prev = existingSceneByHeading.get(scene.headingBlockId) ?? null;

                await upsertScriptScene(tx, {
                    id: scene.id,
                    scriptId,
                    headingBlockId: scene.headingBlockId,
                    sceneNumber: prev?.sceneNumber ?? null,
                    colorHex: prev?.colorHex ?? null,
                    synopsis: prev?.synopsis ?? null,
                    locationId: prev?.locationId ?? null,
                    createdAt: prev?.createdAt ?? now,
                    updatedAt: now,
                });
            }

            for (const scene of existingScenes) {
                if (!nextSceneIds.has(scene.id)) {
                    await deleteScriptScene(tx, scene.id);
                }
            }

            // 3. Delete removed blocks (their character refs cascade).
            await bulkDeleteScriptBlocks(tx, diff.deletedIds);

            // 4. Bulk-insert new blocks at collision-free temporary negative orders.
            if (diff.inserted.length > 0) {
                await tx.insert(scriptBlocks).values(diff.inserted.map(block => ({
                    ...toDbBlock(block),
                    blockOrder: -INSERT_TEMP_OFFSET - block.orderNo,
                })));
            }

            /*
             * 5. Update non-order fields ONLY for blocks that actually changed them.
             * A pure reorder changes order only -> zero per-row field writes here;
             * all ordering is applied by the single bulk statement in step 6.
             */
            for (const block of fieldChangedUpdated) {
                await updateBlockFields(tx, block);
            }

            // 6. Assign all final orders in one bulk statement (collision-safe).
            await writeFinalBlockOrders(
                tx,
                scriptId,
                extracted.blocks.map(block => ({id: block.blockId, blockOrder: block.orderNo})),
            );

            // 7. Rewrite refs only for inserted + blocks whose refs changed.
            for (const block of [...diff.inserted, ...refChangedUpdated]) {
                await replaceScriptBlockCharacterRefs(tx, block.blockId, toCharacterRefRows(block, knownCharacterIds));
            }
        });

        setBaseline(extracted.blocks);
    };

    return {persist, setBaseline};
};
