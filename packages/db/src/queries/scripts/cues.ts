import {
    and,
    asc,
    eq,
    inArray,
    sql,
} from 'drizzle-orm';

import {scriptCues} from '../../schema';
import type {DbClient} from '../types';

export interface ScriptCueUpsertRow {
    id: string,
    scriptId: string,
    sceneNumber: number,
    indexInScene: number,
    mode: string,
    title: string,
    kind: string | null,
    startBlockId: string | null,
    endBlockId: string | null,
    createdAt: number,
    updatedAt: number,
}

export type InsertScriptCueRow = ScriptCueUpsertRow;

export const listScriptCues = async (db: DbClient, scriptId: string) => {
    return db
        .select()
        .from(scriptCues)
        .where(eq(scriptCues.scriptId, scriptId))
        .orderBy(asc(scriptCues.sceneNumber), asc(scriptCues.indexInScene));
};

export const bulkUpsertScriptCues = async (db: DbClient, rows: ScriptCueUpsertRow[]) => {
    if (rows.length === 0) {
        return;
    }

    await db
        .insert(scriptCues)
        .values(rows)
        .onConflictDoUpdate({
            target: scriptCues.id,
            set: {
                sceneNumber: sql`excluded."scene_number"`,
                indexInScene: sql`excluded."index_in_scene"`,
                mode: sql`excluded."mode"`,
                title: sql`excluded."title"`,
                kind: sql`excluded."kind"`,
                startBlockId: sql`excluded."start_block_id"`,
                endBlockId: sql`excluded."end_block_id"`,
                updatedAt: sql`excluded."updated_at"`,
            },
        });
};

export const insertScriptCue = async (db: DbClient, row: InsertScriptCueRow) => {
    await db
        .insert(scriptCues)
        .values(row);
};

export const getScriptCueById = async (
    db: DbClient,
    payload: {scriptId: string, cueId: string},
) => {
    const rows = await db
        .select()
        .from(scriptCues)
        .where(and(
            eq(scriptCues.scriptId, payload.scriptId),
            eq(scriptCues.id, payload.cueId),
        ))
        .limit(1);

    return rows[0] ?? null;
};

export const updateScriptCue = async (
    db: DbClient,
    payload: {
        scriptId: string,
        cueId: string,
        title: string,
        kind: 'song' | 'instrumental',
        updatedAt: number,
    },
) => {
    await db
        .update(scriptCues)
        .set({
            title: payload.title,
            kind: payload.kind,
            updatedAt: payload.updatedAt,
        })
        .where(and(
            eq(scriptCues.scriptId, payload.scriptId),
            eq(scriptCues.id, payload.cueId),
        ));
};

export const bulkUnassignScriptCues = async (db: DbClient, cueIds: string[], updatedAt: number) => {
    if (cueIds.length === 0) {
        return;
    }

    await db
        .update(scriptCues)
        .set({
            startBlockId: null,
            endBlockId: null,
            updatedAt,
        })
        .where(inArray(scriptCues.id, cueIds));
};

export const unassignScriptCue = async (
    db: DbClient,
    payload: {
        scriptId: string, cueId: string, updatedAt: number,
    },
) => {
    await db
        .update(scriptCues)
        .set({
            startBlockId: null,
            endBlockId: null,
            updatedAt: payload.updatedAt,
        })
        .where(and(
            eq(scriptCues.scriptId, payload.scriptId),
            eq(scriptCues.id, payload.cueId),
        ));
};

export const deleteScriptCue = async (
    db: DbClient,
    payload: {scriptId: string, cueId: string},
) => {
    await db
        .delete(scriptCues)
        .where(and(
            eq(scriptCues.scriptId, payload.scriptId),
            eq(scriptCues.id, payload.cueId),
        ));
};

export const bulkDeleteScriptCues = async (db: DbClient, cueIds: string[]) => {
    if (cueIds.length === 0) {
        return;
    }

    await db.delete(scriptCues).where(inArray(scriptCues.id, cueIds));
};
