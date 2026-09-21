import {and, asc, eq, type InferInsertModel} from 'drizzle-orm';

import {scriptLocations} from '../../schema';
import type {DbClient} from '../types';

export interface UpsertScriptLocationPayload {
    id: string;
    scriptId: string;
    name: string;
    description: string | null;
    createdAt: number;
    updatedAt: number;
}

export const insertScriptLocations = async (db: DbClient, rows: InferInsertModel<typeof scriptLocations>[]) => {
    if (rows.length === 0) {
        return;
    }

    await db.insert(scriptLocations).values(rows);
};

export const deleteScriptLocationsByScriptId = async (db: DbClient, scriptId: string) => {
    await db.delete(scriptLocations).where(eq(scriptLocations.scriptId, scriptId));
};

export const listScriptLocations = async (db: DbClient, scriptId: string) => {
    return db.select().from(scriptLocations).where(eq(scriptLocations.scriptId, scriptId)).orderBy(asc(scriptLocations.name));
};

export const getScriptLocationById = async (db: DbClient, payload: {scriptId: string; locationId: string}) => {
    const rows = await db
        .select()
        .from(scriptLocations)
        .where(and(eq(scriptLocations.scriptId, payload.scriptId), eq(scriptLocations.id, payload.locationId)))
        .limit(1);

    return rows[0] ?? null;
};

export const upsertScriptLocation = async (db: DbClient, payload: UpsertScriptLocationPayload) => {
    await db
        .insert(scriptLocations)
        .values({
            id: payload.id,
            scriptId: payload.scriptId,
            name: payload.name,
            description: payload.description,
            createdAt: payload.createdAt,
            updatedAt: payload.updatedAt,
        })
        .onConflictDoUpdate({
            target: scriptLocations.id,
            set: {
                name: payload.name,
                description: payload.description,
                updatedAt: payload.updatedAt,
            },
        });
};

export const updateScriptLocationName = async (
    db: DbClient,
    payload: {
        scriptId: string;
        locationId: string;
        name: string;
        updatedAt: number;
    },
) => {
    await db
        .update(scriptLocations)
        .set({
            name: payload.name,
            updatedAt: payload.updatedAt,
        })
        .where(and(eq(scriptLocations.scriptId, payload.scriptId), eq(scriptLocations.id, payload.locationId)));
};

export const deleteScriptLocation = async (db: DbClient, payload: {scriptId: string; locationId: string}) => {
    await db.delete(scriptLocations).where(and(eq(scriptLocations.scriptId, payload.scriptId), eq(scriptLocations.id, payload.locationId)));
};
