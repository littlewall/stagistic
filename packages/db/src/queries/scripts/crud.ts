import {desc, eq} from 'drizzle-orm';

import {scripts} from '../../schema';
import type {ScriptSummary} from '../../scriptTypes';
import type {DbClient} from '../types';

/**
 * List all scripts ordered by last update.
 */
export const listScripts = async (
    db: DbClient,
    options?: {limit?: number},
): Promise<ScriptSummary[]> => {
    let query = db
        .select()
        .from(scripts)
        .orderBy(desc(scripts.updatedAt));

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    const rows = await query;

    return rows.map(row => ({
        id: row.id,
        title: row.title,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        activeBlockId: row.activeBlockId ?? null,
    }));
};

/**
 * Fetch a single script summary by ID.
 */
export const getScriptSummary = async (
    db: DbClient,
    scriptId: string,
): Promise<ScriptSummary | null> => {
    const rows = await db
        .select()
        .from(scripts)
        .where(eq(scripts.id, scriptId))
        .limit(1);

    const row = rows[0];

    if (!row) {
        return null;
    }

    return {
        id: row.id,
        title: row.title,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        activeBlockId: row.activeBlockId ?? null,
    };
};

/**
 * Insert a new script.
 */
export const insertScript = async (db: DbClient, payload: {
    id: string,
    title: string,
    createdAt: number,
    updatedAt: number,
}) => {
    await db.insert(scripts).values({
        id: payload.id,
        title: payload.title,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
    });
};

/**
 * Update script title and updatedAt.
 */
export const updateScriptTitle = async (db: DbClient, payload: {
    id: string,
    title: string,
    updatedAt: number,
}) => {
    await db
        .update(scripts)
        .set({title: payload.title, updatedAt: payload.updatedAt})
        .where(eq(scripts.id, payload.id));
};

/**
 * Delete a script by ID.
 */
export const deleteScript = async (db: DbClient, scriptId: string) => {
    await db.delete(scripts).where(eq(scripts.id, scriptId));
};

/**
 * Update the active block for a script.
 */
export const updateActiveBlock = async (db: DbClient, payload: {
    scriptId: string,
    activeBlockId: string | null,
}) => {
    await db
        .update(scripts)
        .set({activeBlockId: payload.activeBlockId})
        .where(eq(scripts.id, payload.scriptId));
};

/**
 * Update only the updatedAt timestamp for a script.
 */
export const updateScriptTimestamp = async (db: DbClient, payload: {
    scriptId: string,
    updatedAt: number,
}) => {
    await db
        .update(scripts)
        .set({updatedAt: payload.updatedAt})
        .where(eq(scripts.id, payload.scriptId));
};
