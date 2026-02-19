import {eq} from 'drizzle-orm';

import {scriptVersions} from '../../schema';
import type {DbClient} from '../types';
import type {InsertVersionPayload} from './payloads';

/**
 * Insert a new script version.
 */
export const insertVersion = async (db: DbClient, payload: InsertVersionPayload) => {
    await db.insert(scriptVersions).values({
        id: payload.id,
        scriptId: payload.scriptId,
        message: payload.message,
        contentJson: payload.contentJson,
        createdAt: payload.createdAt,
        schemaVersion: payload.schemaVersion,
    });
};

/**
 * Get the content for a specific script version.
 */
export const getVersionContent = async (db: DbClient, versionId: string) => {
    const rows = await db
        .select({contentJson: scriptVersions.contentJson})
        .from(scriptVersions)
        .where(eq(scriptVersions.id, versionId))
        .limit(1);

    return rows[0]?.contentJson ?? null;
};
