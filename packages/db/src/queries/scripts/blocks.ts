import {
    and,
    asc,
    eq,
    inArray,
    isNull,
    sql,
} from 'drizzle-orm';
import {generateKeyBetween, generateNKeysBetween} from 'fractional-indexing';

import {scriptBlocks} from '../../schema';
import type {DbClient} from '../types';

export interface ListScriptBlocksOptions {
    blockType?: string,
    sceneId?: string | null,
    actId?: string | null,
}

export interface ScriptBlockUpsertRow {
    id: string,
    scriptId: string,
    blockType: string,
    blockOrder: string,
    textContent: string,
    contentJson: string | null,
    sceneId: string | null,
    actId: string | null,
    columnGroupId: string | null,
    columnIndex: number | null,
    createdAt: number,
    updatedAt: number,
}

export interface ScriptBlockOrderMove {
    id: string,
    blockOrder: string,
    updatedAt: number,
}

export const listScriptBlocks = async (
    db: DbClient,
    scriptId: string,
    options?: ListScriptBlocksOptions,
) => {
    const predicates = [eq(scriptBlocks.scriptId, scriptId)];

    if (options?.blockType) {
        predicates.push(eq(scriptBlocks.blockType, options.blockType));
    }

    if (options?.sceneId !== undefined) {
        predicates.push(
            options.sceneId === null
                ? isNull(scriptBlocks.sceneId)
                : eq(scriptBlocks.sceneId, options.sceneId),
        );
    }

    if (options?.actId !== undefined) {
        predicates.push(
            options.actId === null
                ? isNull(scriptBlocks.actId)
                : eq(scriptBlocks.actId, options.actId),
        );
    }

    const whereClause = predicates.length === 1
        ? predicates[0]
        : and(...predicates);

    return db
        .select()
        .from(scriptBlocks)
        .where(whereClause)
        .orderBy(asc(scriptBlocks.blockOrder));
};

export const listScriptBlocksByScene = async (db: DbClient, sceneId: string) => {
    return db
        .select()
        .from(scriptBlocks)
        .where(eq(scriptBlocks.sceneId, sceneId))
        .orderBy(asc(scriptBlocks.blockOrder));
};

export const listScriptBlocksByAct = async (db: DbClient, actId: string) => {
    return db
        .select()
        .from(scriptBlocks)
        .where(eq(scriptBlocks.actId, actId))
        .orderBy(asc(scriptBlocks.blockOrder));
};

export const getScriptBlockById = async (db: DbClient, blockId: string) => {
    const rows = await db
        .select()
        .from(scriptBlocks)
        .where(eq(scriptBlocks.id, blockId))
        .limit(1);

    return rows[0] ?? null;
};

const BULK_UPSERT_BATCH_SIZE = 500;

export const bulkUpsertScriptBlocks = async (db: DbClient, rows: ScriptBlockUpsertRow[]) => {
    if (rows.length === 0) {
        return;
    }

    for (let i = 0; i < rows.length; i += BULK_UPSERT_BATCH_SIZE) {
        const batch = rows.slice(i, i + BULK_UPSERT_BATCH_SIZE);

        await db
            .insert(scriptBlocks)
            .values(batch.map(row => ({
                id: row.id,
                scriptId: row.scriptId,
                blockType: row.blockType,
                blockOrder: row.blockOrder,
                textContent: row.textContent,
                contentJson: row.contentJson,
                sceneId: row.sceneId,
                actId: row.actId,
                columnGroupId: row.columnGroupId,
                columnIndex: row.columnIndex,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            })))
            .onConflictDoUpdate({
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
};

export const bulkDeleteScriptBlocks = async (db: DbClient, blockIds: string[]) => {
    if (blockIds.length === 0) {
        return;
    }

    await db.delete(scriptBlocks).where(inArray(scriptBlocks.id, blockIds));
};

export const reorderScriptBlocks = async (
    db: DbClient,
    scriptId: string,
    moves: ScriptBlockOrderMove[],
) => {
    for (const move of moves) {
        await db
            .update(scriptBlocks)
            .set({
                blockOrder: move.blockOrder,
                updatedAt: move.updatedAt,
            })
            .where(
                and(
                    eq(scriptBlocks.scriptId, scriptId),
                    eq(scriptBlocks.id, move.id),
                ),
            );
    }
};

export interface BlockOrderAssignment {
    id: string,
    blockOrder: string,
}

/**
 * Assign final block_order values using fractional index strings.
 * Since there is no unique constraint on block_order, this is a single
 * bulk UPDATE statement — no collision-avoidance phases needed.
 */
export const writeFinalBlockOrders = async (
    db: DbClient,
    scriptId: string,
    assignments: BlockOrderAssignment[],
) => {
    if (assignments.length === 0) {
        return;
    }

    const now = Date.now();
    const valueTuples = sql.join(
        assignments.map(assignment => sql`(${assignment.id}, ${assignment.blockOrder})`),
        sql`, `,
    );

    await db.execute(sql`
        UPDATE ${scriptBlocks} AS b
        SET block_order = v.ord, updated_at = ${now}
        FROM (VALUES ${valueTuples}) AS v(id, ord)
        WHERE b.id = v.id AND b.script_id = ${scriptId}
    `);
};

/**
 * Generate evenly-spaced fractional index keys for N blocks.
 * Used when assigning fresh orders to all blocks in a script (e.g. on structural save).
 */
export const generateBlockOrderKeys = (count: number): string[] => {
    if (count === 0) {
        return [];
    }

    return generateNKeysBetween(null, null, count);
};

/**
 * Compute a fractional index key between two adjacent blocks.
 * Used for single-block moves (insert between neighbors).
 */
export const generateBlockOrderBetween = (
    before: string | null,
    after: string | null,
): string => {
    return generateKeyBetween(before, after);
};

/**
 * Compute N fractional index keys between two anchor blocks.
 * Used when re-keying a run of moved/inserted blocks between stable neighbors.
 */
export const generateBlockOrdersBetween = (
    before: string | null,
    after: string | null,
    count: number,
): string[] => {
    return generateNKeysBetween(before, after, count);
};
