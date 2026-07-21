import {
    and,
    asc,
    eq,
    inArray,
    sql,
} from 'drizzle-orm';

import {scriptMusic} from '../../schema';
import type {DbClient} from '../types';

export interface ScriptMusicUpsertRow {
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

export type InsertScriptMusicRow = ScriptMusicUpsertRow;

export const listScriptMusic = async (db: DbClient, scriptId: string) => {
    return db
        .select()
        .from(scriptMusic)
        .where(eq(scriptMusic.scriptId, scriptId))
        .orderBy(asc(scriptMusic.sceneNumber), asc(scriptMusic.indexInScene));
};

export const bulkUpsertScriptMusic = async (db: DbClient, rows: ScriptMusicUpsertRow[]) => {
    if (rows.length === 0) {
        return;
    }

    await db
        .insert(scriptMusic)
        .values(rows)
        .onConflictDoUpdate({
            target: scriptMusic.id,
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

export const insertScriptMusic = async (db: DbClient, row: InsertScriptMusicRow) => {
    await db
        .insert(scriptMusic)
        .values(row);
};

export const getScriptMusicById = async (
    db: DbClient,
    payload: {scriptId: string, musicId: string},
) => {
    const rows = await db
        .select()
        .from(scriptMusic)
        .where(and(
            eq(scriptMusic.scriptId, payload.scriptId),
            eq(scriptMusic.id, payload.musicId),
        ))
        .limit(1);

    return rows[0] ?? null;
};

export const updateScriptMusic = async (
    db: DbClient,
    payload: {
        scriptId: string,
        musicId: string,
        title: string,
        kind: 'song' | 'instrumental',
        updatedAt: number,
    },
) => {
    await db
        .update(scriptMusic)
        .set({
            title: payload.title,
            kind: payload.kind,
            updatedAt: payload.updatedAt,
        })
        .where(and(
            eq(scriptMusic.scriptId, payload.scriptId),
            eq(scriptMusic.id, payload.musicId),
        ));
};

export const bulkUnassignScriptMusic = async (db: DbClient, musicIds: string[], updatedAt: number) => {
    if (musicIds.length === 0) {
        return;
    }

    await db
        .update(scriptMusic)
        .set({
            startBlockId: null,
            endBlockId: null,
            updatedAt,
        })
        .where(inArray(scriptMusic.id, musicIds));
};

export const unassignScriptMusic = async (
    db: DbClient,
    payload: {
        scriptId: string, musicId: string, updatedAt: number,
    },
) => {
    await db
        .update(scriptMusic)
        .set({
            startBlockId: null,
            endBlockId: null,
            updatedAt: payload.updatedAt,
        })
        .where(and(
            eq(scriptMusic.scriptId, payload.scriptId),
            eq(scriptMusic.id, payload.musicId),
        ));
};

export const deleteScriptMusic = async (
    db: DbClient,
    payload: {scriptId: string, musicId: string},
) => {
    await db
        .delete(scriptMusic)
        .where(and(
            eq(scriptMusic.scriptId, payload.scriptId),
            eq(scriptMusic.id, payload.musicId),
        ));
};

export const bulkDeleteScriptMusic = async (db: DbClient, musicIds: string[]) => {
    if (musicIds.length === 0) {
        return;
    }

    await db.delete(scriptMusic).where(inArray(scriptMusic.id, musicIds));
};
