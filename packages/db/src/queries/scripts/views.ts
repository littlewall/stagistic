import {
    asc,
    eq,
} from 'drizzle-orm';

import {scriptViews} from '../../schema';
import type {DbClient} from '../types';

export interface UpsertScriptViewPayload {
    id: string,
    scriptId: string,
    name: string,
    roleTemplate: string | null,
    configJson: string,
    createdBy: string | null,
    createdAt: number,
    updatedAt: number,
}

export const listScriptViews = async (db: DbClient, scriptId: string) => {
    return db
        .select()
        .from(scriptViews)
        .where(eq(scriptViews.scriptId, scriptId))
        .orderBy(asc(scriptViews.name));
};

export const getScriptViewById = async (db: DbClient, viewId: string) => {
    const rows = await db
        .select()
        .from(scriptViews)
        .where(eq(scriptViews.id, viewId))
        .limit(1);

    return rows[0] ?? null;
};

export const upsertScriptView = async (db: DbClient, payload: UpsertScriptViewPayload) => {
    await db
        .insert(scriptViews)
        .values({
            id: payload.id,
            scriptId: payload.scriptId,
            name: payload.name,
            roleTemplate: payload.roleTemplate,
            configJson: payload.configJson,
            createdBy: payload.createdBy,
            createdAt: payload.createdAt,
            updatedAt: payload.updatedAt,
        })
        .onConflictDoUpdate({
            target: scriptViews.id,
            set: {
                name: payload.name,
                roleTemplate: payload.roleTemplate,
                configJson: payload.configJson,
                updatedAt: payload.updatedAt,
            },
        });
};

export const deleteScriptView = async (db: DbClient, viewId: string) => {
    await db.delete(scriptViews).where(eq(scriptViews.id, viewId));
};
