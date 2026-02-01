import {eq} from 'drizzle-orm';

import {scriptLatest} from '../../schema';
import type {DbClient} from '../types';

/**
 * Insert a new latest script content.
 */
export const insertLatest = async (db: DbClient, payload: {
    scriptId: string,
    contentJson: string,
    updatedAt: number,
    schemaVersion: number,
}) => {
    await db.insert(scriptLatest).values({
        scriptId: payload.scriptId,
        contentJson: payload.contentJson,
        updatedAt: payload.updatedAt,
        schemaVersion: payload.schemaVersion,
    });
};

/**
 * Upsert the latest script content.
 */
export const upsertLatest = async (db: DbClient, payload: {
    scriptId: string,
    contentJson: string,
    updatedAt: number,
    schemaVersion: number,
}) => {
    await db
        .insert(scriptLatest)
        .values({
            scriptId: payload.scriptId,
            contentJson: payload.contentJson,
            updatedAt: payload.updatedAt,
            schemaVersion: payload.schemaVersion,
        })
        .onConflictDoUpdate({
            target: scriptLatest.scriptId,
            set: {
                contentJson: payload.contentJson,
                updatedAt: payload.updatedAt,
                schemaVersion: payload.schemaVersion,
            },
        });
};

/**
 * Get the latest content for a script.
 */
export const getLatestContent = async (db: DbClient, scriptId: string) => {
    const rows = await db
        .select({contentJson: scriptLatest.contentJson})
        .from(scriptLatest)
        .where(eq(scriptLatest.scriptId, scriptId))
        .limit(1);

    return rows[0]?.contentJson ?? null;
};
