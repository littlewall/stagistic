import {
    asc,
    eq,
} from 'drizzle-orm';

import {
    scriptCostumes,
    scriptSceneCostumes,
} from '../../schema';
import type {DbClient} from '../types';

export interface UpsertScriptCostumePayload {
    id: string,
    scriptId: string,
    characterId: string,
    name: string,
    description: string | null,
    createdAt: number,
    updatedAt: number,
}

export interface ScriptSceneCostumeRow {
    costumeId: string,
    quickChange: boolean,
    notes: string | null,
    createdAt: number,
    updatedAt: number,
}

export const listScriptCostumes = async (db: DbClient, scriptId: string) => {
    return db
        .select()
        .from(scriptCostumes)
        .where(eq(scriptCostumes.scriptId, scriptId))
        .orderBy(asc(scriptCostumes.name));
};

export const upsertScriptCostume = async (
    db: DbClient,
    payload: UpsertScriptCostumePayload,
) => {
    await db
        .insert(scriptCostumes)
        .values({
            id: payload.id,
            scriptId: payload.scriptId,
            characterId: payload.characterId,
            name: payload.name,
            description: payload.description,
            createdAt: payload.createdAt,
            updatedAt: payload.updatedAt,
        })
        .onConflictDoUpdate({
            target: scriptCostumes.id,
            set: {
                characterId: payload.characterId,
                name: payload.name,
                description: payload.description,
                updatedAt: payload.updatedAt,
            },
        });
};

export const deleteScriptCostume = async (db: DbClient, costumeId: string) => {
    await db.delete(scriptCostumes).where(eq(scriptCostumes.id, costumeId));
};

export const listScriptSceneCostumes = async (db: DbClient, sceneId: string) => {
    return db
        .select()
        .from(scriptSceneCostumes)
        .where(eq(scriptSceneCostumes.sceneId, sceneId));
};

export const replaceScriptSceneCostumes = async (
    db: DbClient,
    sceneId: string,
    rows: ScriptSceneCostumeRow[],
) => {
    await db
        .delete(scriptSceneCostumes)
        .where(eq(scriptSceneCostumes.sceneId, sceneId));

    if (rows.length === 0) {
        return;
    }

    await db.insert(scriptSceneCostumes).values(rows.map(row => ({
        sceneId,
        costumeId: row.costumeId,
        quickChange: row.quickChange,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    })));
};
