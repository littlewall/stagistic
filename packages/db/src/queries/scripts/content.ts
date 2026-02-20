import {eq} from 'drizzle-orm';

import {scriptLatest} from '../../schema';
import type {DbClient} from '../types';
import type {
    InsertLatestPayload,
    UpsertLatestPayload,
} from './payloads';

/**
 * Insert a new latest script content.
 */
export const insertLatest = async (db: DbClient, payload: InsertLatestPayload) => {
    await db.insert(scriptLatest).values({
        scriptId: payload.scriptId,
        contentJson: payload.contentJson,
        contentHash: payload.contentHash,
        contentSize: payload.contentSize,
        updatedAt: payload.updatedAt,
        schemaVersion: payload.schemaVersion,
    });
};

/**
 * Upsert the latest script content.
 */
export const upsertLatest = async (db: DbClient, payload: UpsertLatestPayload) => {
    await db
        .insert(scriptLatest)
        .values({
            scriptId: payload.scriptId,
            contentJson: payload.contentJson,
            contentHash: payload.contentHash,
            contentSize: payload.contentSize,
            updatedAt: payload.updatedAt,
            schemaVersion: payload.schemaVersion,
        })
        .onConflictDoUpdate({
            target: scriptLatest.scriptId,
            set: {
                contentJson: payload.contentJson,
                contentHash: payload.contentHash,
                contentSize: payload.contentSize,
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

/**
 * Get lightweight metadata for latest content row.
 */
export const getLatestContentMeta = async (db: DbClient, scriptId: string) => {
    const rows = await db
        .select({
            contentHash: scriptLatest.contentHash,
            contentSize: scriptLatest.contentSize,
        })
        .from(scriptLatest)
        .where(eq(scriptLatest.scriptId, scriptId))
        .limit(1);

    return rows[0] ?? null;
};
