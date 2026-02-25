import {
    asc,
    eq,
} from 'drizzle-orm';

import {scriptLocations} from '../../schema';
import type {DbClient} from '../types';

export interface UpsertScriptLocationPayload {
    id: string,
    scriptId: string,
    name: string,
    description: string | null,
    createdAt: number,
    updatedAt: number,
}

export const listScriptLocations = async (db: DbClient, scriptId: string) => {
    return db
        .select()
        .from(scriptLocations)
        .where(eq(scriptLocations.scriptId, scriptId))
        .orderBy(asc(scriptLocations.name));
};

export const upsertScriptLocation = async (
    db: DbClient,
    payload: UpsertScriptLocationPayload,
) => {
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

export const deleteScriptLocation = async (db: DbClient, locationId: string) => {
    await db.delete(scriptLocations).where(eq(scriptLocations.id, locationId));
};
