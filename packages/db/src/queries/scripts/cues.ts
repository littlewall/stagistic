import {
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
    startBlockId: string,
    endBlockId: string | null,
    createdAt: number,
    updatedAt: number,
}

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

export const bulkDeleteScriptCues = async (db: DbClient, cueIds: string[]) => {
    if (cueIds.length === 0) {
        return;
    }

    await db.delete(scriptCues).where(inArray(scriptCues.id, cueIds));
};
