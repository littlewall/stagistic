import {
    asc,
    eq,
    sql,
} from 'drizzle-orm';

import {scriptScenes} from '../../schema';
import type {DbClient} from '../types';

export interface UpsertScriptScenePayload {
    id: string,
    scriptId: string,
    headingBlockId: string | null,
    sceneNumber: string | null,
    colorHex: string | null,
    synopsis: string | null,
    locationId: string | null,
    createdAt: number,
    updatedAt: number,
}

export interface UpdateScriptSceneMetadataPayload {
    sceneId: string,
    sceneNumber?: string | null,
    colorHex?: string | null,
    synopsis?: string | null,
    locationId?: string | null,
    updatedAt: number,
}

export const listScriptScenes = async (db: DbClient, scriptId: string) => {
    return db
        .select()
        .from(scriptScenes)
        .where(eq(scriptScenes.scriptId, scriptId))
        .orderBy(asc(scriptScenes.createdAt));
};

export const upsertScriptScene = async (db: DbClient, payload: UpsertScriptScenePayload) => {
    await db
        .insert(scriptScenes)
        .values({
            id: payload.id,
            scriptId: payload.scriptId,
            headingBlockId: payload.headingBlockId,
            sceneNumber: payload.sceneNumber,
            colorHex: payload.colorHex,
            synopsis: payload.synopsis,
            locationId: payload.locationId,
            createdAt: payload.createdAt,
            updatedAt: payload.updatedAt,
        })
        .onConflictDoUpdate({
            target: scriptScenes.id,
            set: {
                headingBlockId: payload.headingBlockId,
                sceneNumber: payload.sceneNumber,
                colorHex: payload.colorHex,
                synopsis: payload.synopsis,
                locationId: payload.locationId,
                updatedAt: payload.updatedAt,
            },
        });
};

export const bulkUpsertScriptScenes = async (db: DbClient, rows: UpsertScriptScenePayload[]) => {
    if (rows.length === 0) {
        return;
    }

    await db
        .insert(scriptScenes)
        .values(rows.map(row => ({
            id: row.id,
            scriptId: row.scriptId,
            headingBlockId: row.headingBlockId,
            sceneNumber: row.sceneNumber,
            colorHex: row.colorHex,
            synopsis: row.synopsis,
            locationId: row.locationId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        })))
        .onConflictDoUpdate({
            target: scriptScenes.id,
            set: {
                headingBlockId: sql`excluded."heading_block_id"`,
                sceneNumber: sql`excluded."scene_number"`,
                colorHex: sql`excluded."color_hex"`,
                synopsis: sql`excluded."synopsis"`,
                locationId: sql`excluded."location_id"`,
                updatedAt: sql`excluded."updated_at"`,
            },
        });
};

export const deleteScriptScene = async (db: DbClient, sceneId: string) => {
    await db.delete(scriptScenes).where(eq(scriptScenes.id, sceneId));
};

export const updateScriptSceneMetadata = async (
    db: DbClient,
    payload: UpdateScriptSceneMetadataPayload,
) => {
    const updates: {
        sceneNumber?: string | null,
        colorHex?: string | null,
        synopsis?: string | null,
        locationId?: string | null,
        updatedAt: number,
    } = {
        updatedAt: payload.updatedAt,
    };

    const setIfProvided = (
        key: 'sceneNumber' | 'colorHex' | 'synopsis' | 'locationId',
        value: string | null | undefined,
    ) => {
        if (value === undefined) {
            return;
        }

        updates[key] = value;
    };

    setIfProvided('sceneNumber', payload.sceneNumber);
    setIfProvided('colorHex', payload.colorHex);
    setIfProvided('synopsis', payload.synopsis);
    setIfProvided('locationId', payload.locationId);

    await db
        .update(scriptScenes)
        .set(updates)
        .where(eq(scriptScenes.id, payload.sceneId));
};
