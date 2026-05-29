import {
    and,
    asc,
    eq,
    inArray,
    isNull,
    sql,
} from 'drizzle-orm';

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
    blockOrder: number,
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
    blockOrder: number,
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

export const bulkUpsertScriptBlocks = async (db: DbClient, rows: ScriptBlockUpsertRow[]) => {
    if (rows.length === 0) {
        return;
    }

    for (const row of rows) {
        await db
            .insert(scriptBlocks)
            .values({
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
            })
            .onConflictDoUpdate({
                target: scriptBlocks.id,
                set: {
                    blockType: row.blockType,
                    blockOrder: row.blockOrder,
                    textContent: row.textContent,
                    contentJson: row.contentJson,
                    sceneId: row.sceneId,
                    actId: row.actId,
                    columnGroupId: row.columnGroupId,
                    columnIndex: row.columnIndex,
                    updatedAt: row.updatedAt,
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
    blockOrder: number,
}

/**
 * Assign final block_order values without violating the (script_id, block_order)
 * unique index. Phase 1: negate every surviving row of this script into a
 * collision-free temporary range. Phase 2: set the requested final orders
 * (targets are a 0..N permutation, so no final collision). Must run inside a
 * transaction.
 */
export const writeFinalBlockOrders = async (
    db: DbClient,
    scriptId: string,
    assignments: BlockOrderAssignment[],
) => {
    if (assignments.length === 0) {
        return;
    }

    /*
     * Phase 1: move every existing row to negative space (preserves uniqueness,
     * cannot collide with the positive final targets).
     */
    await db
        .update(scriptBlocks)
        .set({blockOrder: sql`(-${scriptBlocks.blockOrder} - 1)`})
        .where(eq(scriptBlocks.scriptId, scriptId));

    /*
     * Phase 2: set all final orders in a SINGLE bulk statement. A reorder of one
     * scene in a feature-length script shifts hundreds of rows; doing per-row
     * awaited UPDATEs (one worker round-trip each) is pathologically slow and
     * the transaction may not finish before a page refresh. UPDATE ... FROM
     * (VALUES ...) applies the whole permutation at once; the unique index is
     * evaluated at statement end against the final (valid) set.
     */
    const now = Date.now();
    const valueTuples = sql.join(
        assignments.map(assignment => sql`(${assignment.id}, ${assignment.blockOrder})`),
        sql`, `,
    );

    await db.execute(sql`
        UPDATE ${scriptBlocks} AS b
        SET block_order = v.ord::int, updated_at = ${now}
        FROM (VALUES ${valueTuples}) AS v(id, ord)
        WHERE b.id = v.id AND b.script_id = ${scriptId}
    `);
};
