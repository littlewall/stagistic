import {
    asc,
    eq,
} from 'drizzle-orm';

import {
    scriptProps,
    scriptSceneProps,
} from '../../schema';
import type {DbClient} from '../types';

export interface UpsertScriptPropPayload {
    id: string,
    scriptId: string,
    name: string,
    description: string | null,
    category: string | null,
    createdAt: number,
    updatedAt: number,
}

export interface ScriptScenePropRow {
    propId: string,
    notes: string | null,
    createdAt: number,
    updatedAt: number,
}

export const listScriptProps = async (db: DbClient, scriptId: string) => {
    return db
        .select()
        .from(scriptProps)
        .where(eq(scriptProps.scriptId, scriptId))
        .orderBy(asc(scriptProps.name));
};

export const upsertScriptProp = async (db: DbClient, payload: UpsertScriptPropPayload) => {
    await db
        .insert(scriptProps)
        .values({
            id: payload.id,
            scriptId: payload.scriptId,
            name: payload.name,
            description: payload.description,
            category: payload.category,
            createdAt: payload.createdAt,
            updatedAt: payload.updatedAt,
        })
        .onConflictDoUpdate({
            target: scriptProps.id,
            set: {
                name: payload.name,
                description: payload.description,
                category: payload.category,
                updatedAt: payload.updatedAt,
            },
        });
};

export const deleteScriptProp = async (db: DbClient, propId: string) => {
    await db.delete(scriptProps).where(eq(scriptProps.id, propId));
};

export const listScriptSceneProps = async (db: DbClient, sceneId: string) => {
    return db
        .select()
        .from(scriptSceneProps)
        .where(eq(scriptSceneProps.sceneId, sceneId));
};

export const replaceScriptSceneProps = async (
    db: DbClient,
    sceneId: string,
    rows: ScriptScenePropRow[],
) => {
    await db.delete(scriptSceneProps).where(eq(scriptSceneProps.sceneId, sceneId));

    if (rows.length === 0) {
        return;
    }

    await db.insert(scriptSceneProps).values(rows.map(row => ({
        sceneId,
        propId: row.propId,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    })));
};
