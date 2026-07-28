import {
    asc,
    eq,
    inArray,
    sql,
} from 'drizzle-orm';

import {scriptActs} from '../../schema';
import type {DbClient} from '../types';

export interface UpsertScriptActPayload {
    id: string,
    scriptId: string,
    headingBlockId: string | null,
    name: string,
    createdAt: number,
    updatedAt: number,
}

export const listScriptActs = async (db: DbClient, scriptId: string) => {
    return db
        .select()
        .from(scriptActs)
        .where(eq(scriptActs.scriptId, scriptId))
        .orderBy(asc(scriptActs.createdAt));
};

export const upsertScriptAct = async (db: DbClient, payload: UpsertScriptActPayload) => {
    await db
        .insert(scriptActs)
        .values({
            id: payload.id,
            scriptId: payload.scriptId,
            headingBlockId: payload.headingBlockId,
            name: payload.name,
            createdAt: payload.createdAt,
            updatedAt: payload.updatedAt,
        })
        .onConflictDoUpdate({
            target: scriptActs.id,
            set: {
                headingBlockId: payload.headingBlockId,
                name: payload.name,
                updatedAt: payload.updatedAt,
            },
        });
};

export const bulkUpsertScriptActs = async (db: DbClient, rows: UpsertScriptActPayload[]) => {
    if (rows.length === 0) {
        return;
    }

    await db
        .insert(scriptActs)
        .values(rows.map(row => ({
            id: row.id,
            scriptId: row.scriptId,
            headingBlockId: row.headingBlockId,
            name: row.name,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        })))
        .onConflictDoUpdate({
            target: scriptActs.id,
            set: {
                headingBlockId: sql`excluded."heading_block_id"`,
                name: sql`excluded."name"`,
                updatedAt: sql`excluded."updated_at"`,
            },
        });
};

export const deleteScriptAct = async (db: DbClient, actId: string) => {
    await db.delete(scriptActs).where(eq(scriptActs.id, actId));
};

export const bulkDeleteScriptActs = async (db: DbClient, actIds: string[]) => {
    if (actIds.length === 0) {
        return;
    }

    await db.delete(scriptActs).where(inArray(scriptActs.id, actIds));
};
