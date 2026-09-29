import {and, eq, sql} from 'drizzle-orm';

import {type ExtractedBlockRow, extractScriptBlocks, type RewriteScriptDocument} from '../../blocks';
import {bulkDeleteScriptBlocks, bulkReplaceScriptBlockCharacterRefs, type DbClient, listScriptSpeakingEntities, writeFinalBlockOrders} from '../../queries';
import {scriptBlocks} from '../../schema';
import {toCharacterRefRows} from '../characterRefRows';
import {assignOrderKeys} from './assignOrderKeys';
import {nonOrderFieldsDiffer, refsDiffer} from './blockRowDiff';
import {diffExtractedBlocks} from './diffExtractedBlocks';
import {reconcileActsAndScenes} from './reconcileActsAndScenes';
import {getMusicSignature, reconcileScriptMusic} from './reconcileScriptMusic';

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
    let baselineOrderKeys = new Map<string, string>();
    let lastSavedMusicSignature = '';
    let queue: Promise<void> = Promise.resolve();

    const setBaseline = (blocks: ExtractedBlockRow[], orderKeys?: Map<string, string>) => {
        lastSavedBlocks = new Map(blocks.map(block => [block.blockId, block]));
        baselineOrderKeys = orderKeys ?? new Map<string, string>();
        lastSavedMusicSignature = '';
    };

    const persistImpl = async (db: DbClient, document: RewriteScriptDocument, afterPersist?: (tx: DbClient) => Promise<void>): Promise<void> => {
        const now = Date.now();
        const extracted = extractScriptBlocks(scriptId, document);

        const musicSignature = getMusicSignature(extracted.music);
        const reconcileMusic = async (tx: DbClient) => {
            if (musicSignature === lastSavedMusicSignature) {
                return;
            }

            await reconcileScriptMusic(tx, scriptId, extracted.music, now);
        };

        const diff = diffExtractedBlocks(Array.from(lastSavedBlocks.values()), extracted.blocks);

        if (diff.inserted.length === 0 && diff.updated.length === 0 && diff.deletedIds.length === 0) {
            if (afterPersist || musicSignature !== lastSavedMusicSignature) {
                await db.transaction(async tx => {
                    await reconcileMusic(tx);

                    if (afterPersist) {
                        await afterPersist(tx);
                    }
                });
            }

            lastSavedMusicSignature = musicSignature;

            return;
        }

        const sceneIdByHeading = new Map(extracted.scenes.map(scene => [scene.headingBlockId, scene.id]));
        const actIdByHeading = new Map(extracted.acts.map(act => [act.headingBlockId, act.id]));

        const {orderKeyById, changedOrders} = diff.structural
            ? assignOrderKeys(extracted.blocks, baselineOrderKeys)
            : {orderKeyById: baselineOrderKeys, changedOrders: []};

        /*
         * blockOrder fallback is never written: Case A skips order writes entirely
         * and the structural path always has complete orderKeyById coverage.
         */
        const toDbBlock = (block: ExtractedBlockRow) => ({
            id: block.blockId,
            scriptId,
            blockType: block.blockType,
            blockOrder: orderKeyById.get(block.blockId) ?? '',
            textContent: block.textContent,
            contentJson: block.contentJson,
            sceneId: block.sceneHeadingBlockId ? (sceneIdByHeading.get(block.sceneHeadingBlockId) ?? null) : null,
            actId: block.actHeadingBlockId ? (actIdByHeading.get(block.actHeadingBlockId) ?? null) : null,
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

        const fieldChangedUpdated = diff.updated.filter(block => nonOrderFieldsDiffer(lastSavedBlocks.get(block.blockId), block));
        const refChangedUpdated = diff.updated.filter(block => refsDiffer(lastSavedBlocks.get(block.blockId), block));

        const knownCharacterIds =
            diff.inserted.length > 0 || refChangedUpdated.length > 0
                ? new Set((await listScriptSpeakingEntities(db, scriptId)).map(entity => entity.id))
                : new Set<string>();

        const replaceRefs = async (tx: DbClient, blocks: ExtractedBlockRow[]) => {
            await bulkReplaceScriptBlockCharacterRefs(
                tx,
                blocks.map(block => ({
                    blockId: block.blockId,
                    rows: toCharacterRefRows(block, knownCharacterIds),
                })),
            );
        };

        /*
         * A pure reorder changes only orderNo (and possibly refs). Block→scene/act
         * membership is intact and scene/act ids derive from heading block ids,
         * so the scriptScenes/scriptActs tables are guaranteed unchanged —
         * reconciliation can be skipped entirely.
         */
        const isPureReorder = diff.inserted.length === 0 && diff.deletedIds.length === 0 && fieldChangedUpdated.length === 0;

        const writeDelta = async (tx: DbClient) => {
            if (!diff.structural) {
                // Case A: content-only edits — touch only blocks whose fields/refs actually changed.
                for (const block of fieldChangedUpdated) {
                    await updateBlockFields(tx, block);
                }

                await replaceRefs(tx, refChangedUpdated);

                return;
            }

            if (isPureReorder) {
                // Case B-fast: pure reorder — only the moved blocks' orders (and refs) change.
                await writeFinalBlockOrders(tx, scriptId, changedOrders);
                await replaceRefs(tx, refChangedUpdated);

                return;
            }

            // Case B: structural change (insert/delete/heading edit). 1–2. Reconcile acts and scenes.
            await reconcileActsAndScenes(tx, scriptId, extracted, now);

            // 3. Delete removed blocks (their character refs cascade).
            await bulkDeleteScriptBlocks(tx, diff.deletedIds);

            /*
             * 4. Insert new blocks with their fractional index orders.
             *    Uses ON CONFLICT as a safety net — if a prior persist already
             *    inserted the same block (serialization edge case), update it.
             */
            if (diff.inserted.length > 0) {
                await tx
                    .insert(scriptBlocks)
                    .values(
                        diff.inserted.map(block => ({
                            ...toDbBlock(block),
                        })),
                    )
                    .onConflictDoUpdate({
                        target: scriptBlocks.id,
                        set: {
                            blockType: sql`excluded."block_type"`,
                            blockOrder: sql`excluded."block_order"`,
                            textContent: sql`excluded."text_content"`,
                            contentJson: sql`excluded."content_json"`,
                            sceneId: sql`excluded."scene_id"`,
                            actId: sql`excluded."act_id"`,
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

            /*
             * 6. Assign changed orders in one bulk statement. Inserted blocks
             * already carry their key from step 4.
             */
            const insertedIds = new Set(diff.inserted.map(block => block.blockId));

            await writeFinalBlockOrders(
                tx,
                scriptId,
                changedOrders.filter(assignment => !insertedIds.has(assignment.id)),
            );

            // 7. Rewrite refs only for inserted + blocks whose refs changed.
            await replaceRefs(tx, [...diff.inserted, ...refChangedUpdated]);
        };

        await db.transaction(async tx => {
            await writeDelta(tx);
            await reconcileMusic(tx);

            if (afterPersist) {
                await afterPersist(tx);
            }
        });

        setBaseline(extracted.blocks, orderKeyById);
        lastSavedMusicSignature = musicSignature;
    };

    const persist = (db: DbClient, document: RewriteScriptDocument, afterPersist?: (tx: DbClient) => Promise<void>): Promise<void> => {
        const result = queue.then(() => persistImpl(db, document, afterPersist));

        /*
         * Keep the chain alive even if persistImpl rejects — the next call
         * must still wait for this one to settle before reading baseline.
         */
        queue = result.catch(() => {});

        return result;
    };

    return {persist, setBaseline};
};
