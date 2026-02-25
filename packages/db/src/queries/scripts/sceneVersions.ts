import {
    desc,
    eq,
} from 'drizzle-orm';

import {scriptSceneVersions} from '../../schema';
import type {DbClient} from '../types';

export interface InsertScriptSceneVersionPayload {
    id: string,
    sceneId: string,
    message: string | null,
    blocksJson: string,
    createdAt: number,
}

export const listScriptSceneVersions = async (db: DbClient, sceneId: string) => {
    return db
        .select()
        .from(scriptSceneVersions)
        .where(eq(scriptSceneVersions.sceneId, sceneId))
        .orderBy(desc(scriptSceneVersions.createdAt));
};

export const getScriptSceneVersionById = async (db: DbClient, versionId: string) => {
    const rows = await db
        .select()
        .from(scriptSceneVersions)
        .where(eq(scriptSceneVersions.id, versionId))
        .limit(1);

    return rows[0] ?? null;
};

export const insertScriptSceneVersion = async (
    db: DbClient,
    payload: InsertScriptSceneVersionPayload,
) => {
    await db.insert(scriptSceneVersions).values({
        id: payload.id,
        sceneId: payload.sceneId,
        message: payload.message,
        blocksJson: payload.blocksJson,
        createdAt: payload.createdAt,
    });
};
