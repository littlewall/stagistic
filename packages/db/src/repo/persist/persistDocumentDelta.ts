import {
    and, eq, sql,
} from 'drizzle-orm';

import {
    type ExtractedBlockRow,
    extractScriptBlocks,
    type RewriteScriptDocument,
} from '../../blocks';
import {
    bulkDeleteScriptActs,
    bulkDeleteScriptBlocks,
    bulkDeleteScriptScenes,
    bulkReplaceScriptBlockCharacterRefs,
    bulkUpsertScriptActs,
    bulkUpsertScriptScenes,
    type DbClient,
    generateBlockOrderKeys,
    listScriptCharacters,
    writeFinalBlockOrders,
} from '../../queries';
import {
    scriptActs, scriptBlocks, scriptScenes,
} from '../../schema';
import {diffExtractedBlocks} from './diffExtractedBlocks';

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
 *
 * Calls to `persist` are serialized internally — if a second call arrives while
 * the first is still running, it waits for the first to finish so it sees the
 * updated baseline. This prevents duplicate-key errors from racing inserts.
 */
export const createDocumentPersister = (scriptId: string) => {
    let lastSavedBlocks = new Map<string, ExtractedBlockRow>();
    let queue: Promise<void> = Promise.resolve();

    const setBaseline = (blocks: ExtractedBlockRow[]) => {
        lastSavedBlocks = new Map(blocks.map(block => [block.blockId, block]));
    };

    const persistImpl = async (db: DbClient, document: RewriteScriptDocument): Promise<void> => {
        const now = Date.now();
        const extracted = extractScriptBlocks(scriptId, document);
        const diff = diffExtractedBlocks(Array.from(lastSavedBlocks.values()), extracted.blocks);

        if (diff.inserted.length === 0 && diff.updated.length === 0 && diff.deletedIds.length === 0) {
            return;
        }

        const sceneIdByHeading = new Map(extracted.scenes.map(scene => [scene.headingBlockId, scene.id]));
        const actIdByHeading = new Map(extracted.acts.map(act => [act.headingBlockId, act.id]));

        /*
         * Fractional-indexing strategy: generate N evenly-spaced lexicographic keys
         * (from the `fractional-indexing` library) for every block on each structural
         * save. This means a reorder is a single bulk UPDATE — no gaps, no renumbering.
         * The unique constraint on (script_id, block_order) was intentionally removed
         * by migrations 0004/0005: PostgreSQL checks uniqueness row-by-row inside a
         * single UPDATE, so swapping keys between two blocks always triggers a
         * spurious violation before both rows are committed.
         */
        const orderKeys = generateBlockOrderKeys(extracted.blocks.length);

        const toDbBlock = (block: ExtractedBlockRow) => ({
            id: block.blockId,
            scriptId,
            blockType: block.blockType,
            blockOrder: orderKeys[block.orderNo],
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

        const knownCharacterIds = diff.inserted.length > 0 || refChangedUpdated.length > 0
            ? new Set((await listScriptCharacters(db, scriptId)).map(character => character.id))
            : new Set<string>();

        const replaceRefs = async (tx: DbClient, blocks: ExtractedBlockRow[]) => {
            await bulkReplaceScriptBlockCharacterRefs(tx, blocks.map(block => ({
                blockId: block.blockId,
                rows: toCharacterRefRows(block, knownCharacterIds),
            })));
        };

        /*
         * A pure reorder changes only orderNo (and possibly refs). Block→scene/act
         * membership is intact and scene/act ids derive from heading block ids,
         * so the scriptScenes/scriptActs tables are guaranteed unchanged —
         * reconciliation can be skipped entirely.
         */
        const isPureReorder = diff.inserted.length === 0
            && diff.deletedIds.length === 0
            && fieldChangedUpdated.length === 0;

        await db.transaction(async tx => {
            if (!diff.structural) {
                // Case A: content-only edits — touch only blocks whose fields/refs actually changed.
                for (const block of fieldChangedUpdated) {
                    await updateBlockFields(tx, block);
                }

                await replaceRefs(tx, refChangedUpdated);

                return;
            }

            if (isPureReorder) {
                // Case B-fast: pure reorder — only block orders (and refs) change.
                await writeFinalBlockOrders(
                    tx,
                    scriptId,
                    extracted.blocks.map(block => ({id: block.blockId, blockOrder: orderKeys[block.orderNo]})),
                );

                await replaceRefs(tx, refChangedUpdated);

                return;
            }

            /*
             * Case B: structural change (insert/delete/heading edit).
             * 1. Reconcile acts.
             */
            const existingActs = await tx.select({id: scriptActs.id}).from(scriptActs).where(eq(scriptActs.scriptId, scriptId));
            const nextActIds = new Set(extracted.acts.map(act => act.id));

            await bulkUpsertScriptActs(tx, extracted.acts.map(act => ({
                id: act.id,
                scriptId,
                headingBlockId: act.headingBlockId,
                name: act.name,
                createdAt: now,
                updatedAt: now,
            })));

            await bulkDeleteScriptActs(tx, existingActs.filter(act => !nextActIds.has(act.id)).map(act => act.id));

            // 2. Reconcile scenes (preserve existing metadata).
            const existingScenes = await tx.select().from(scriptScenes).where(eq(scriptScenes.scriptId, scriptId));
            const existingSceneByHeading = new Map(
                existingScenes
                    .filter(scene => scene.headingBlockId)
                    .map(scene => [scene.headingBlockId as string, scene] as const),
            );
            const nextSceneIds = new Set(extracted.scenes.map(scene => scene.id));

            await bulkUpsertScriptScenes(tx, extracted.scenes.map(scene => {
                const prev = existingSceneByHeading.get(scene.headingBlockId) ?? null;

                return {
                    id: scene.id,
                    scriptId,
                    headingBlockId: scene.headingBlockId,
                    sceneNumber: prev?.sceneNumber ?? null,
                    colorHex: prev?.colorHex ?? null,
                    synopsis: prev?.synopsis ?? null,
                    locationId: prev?.locationId ?? null,
                    createdAt: prev?.createdAt ?? now,
                    updatedAt: now,
                };
            }));

            await bulkDeleteScriptScenes(tx, existingScenes.filter(scene => !nextSceneIds.has(scene.id)).map(scene => scene.id));

            // 3. Delete removed blocks (their character refs cascade).
            await bulkDeleteScriptBlocks(tx, diff.deletedIds);

            /*
             * 4. Insert new blocks with their fractional index orders.
             *    Uses ON CONFLICT as a safety net — if a prior persist already
             *    inserted the same block (serialization edge case), update it.
             */
            if (diff.inserted.length > 0) {
                await tx.insert(scriptBlocks).values(diff.inserted.map(block => ({
                    ...toDbBlock(block),
                }))).onConflictDoUpdate({
                    target: scriptBlocks.id,
                    set: {
                        blockType: sql`excluded."block_type"`,
                        blockOrder: sql`excluded."block_order"`,
                        textContent: sql`excluded."text_content"`,
                        contentJson: sql`excluded."content_json"`,
                        sceneId: sql`excluded."scene_id"`,
                        actId: sql`excluded."act_id"`,
                        columnGroupId: sql`excluded."column_group_id"`,
                        columnIndex: sql`excluded."column_index"`,
                        updatedAt: sql`excluded."updated_at"`,
                    },
                });
            }

            /*
             * 5. Update non-order fields ONLY for blocks that actually changed them.
             * A pure reorder changes order only -> zero per-row field writes here;
             * all ordering is applied by the single bulk statement in step 6.
             */
            for (const block of fieldChangedUpdated) {
                await updateBlockFields(tx, block);
            }

            // 6. Assign all final orders in one bulk statement.
            await writeFinalBlockOrders(
                tx,
                scriptId,
                extracted.blocks.map(block => ({id: block.blockId, blockOrder: orderKeys[block.orderNo]})),
            );

            // 7. Rewrite refs only for inserted + blocks whose refs changed.
            await replaceRefs(tx, [...diff.inserted, ...refChangedUpdated]);
        });

        setBaseline(extracted.blocks);
    };

    const persist = (db: DbClient, document: RewriteScriptDocument): Promise<void> => {
        const result = queue.then(() => persistImpl(db, document));

        /*
         * Keep the chain alive even if persistImpl rejects — the next call
         * must still wait for this one to settle before reading baseline.
         */
        queue = result.catch(() => {});

        return result;
    };

    return {persist, setBaseline};
};
