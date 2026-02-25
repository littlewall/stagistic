import {
    asc,
    eq,
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

export const deleteScriptAct = async (db: DbClient, actId: string) => {
    await db.delete(scriptActs).where(eq(scriptActs.id, actId));
};
