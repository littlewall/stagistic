import {desc, eq} from 'drizzle-orm';

import {
    scriptLatest,
    scripts,
    scriptVersions,
    syncOutbox,
} from '../schema';
import type {ScriptSummary} from '../scriptTypes';
import type {DbClient} from './types';

export const listScripts = async (db: DbClient): Promise<ScriptSummary[]> => {
    const rows = await db
        .select()
        .from(scripts)
        .orderBy(desc(scripts.updatedAt));

    return rows.map(row => ({
        id: row.id,
        title: row.title,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        activeBlockId: row.activeBlockId ?? null,
    }));
};

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

export const deleteScript = async (db: DbClient, scriptId: string) => {
    await db.delete(scripts).where(eq(scripts.id, scriptId));
};

export const updateActiveBlock = async (db: DbClient, payload: {
    scriptId: string,
    activeBlockId: string | null,
}) => {
    await db
        .update(scripts)
        .set({activeBlockId: payload.activeBlockId})
        .where(eq(scripts.id, payload.scriptId));
};

export const updateScriptTimestamp = async (db: DbClient, payload: {
    scriptId: string,
    updatedAt: number,
}) => {
    await db
        .update(scripts)
        .set({updatedAt: payload.updatedAt})
        .where(eq(scripts.id, payload.scriptId));
};

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

export const getLatestContent = async (db: DbClient, scriptId: string) => {
    const rows = await db
        .select({contentJson: scriptLatest.contentJson})
        .from(scriptLatest)
        .where(eq(scriptLatest.scriptId, scriptId))
        .limit(1);

    return rows[0]?.contentJson ?? null;
};

export const insertVersion = async (db: DbClient, payload: {
    id: string,
    scriptId: string,
    message: string | null,
    contentJson: string,
    createdAt: number,
    schemaVersion: number,
}) => {
    await db.insert(scriptVersions).values({
        id: payload.id,
        scriptId: payload.scriptId,
        message: payload.message,
        contentJson: payload.contentJson,
        createdAt: payload.createdAt,
        schemaVersion: payload.schemaVersion,
    });
};

export const getVersionContent = async (db: DbClient, versionId: string) => {
    const rows = await db
        .select({contentJson: scriptVersions.contentJson})
        .from(scriptVersions)
        .where(eq(scriptVersions.id, versionId))
        .limit(1);

    return rows[0]?.contentJson ?? null;
};

export const insertOutbox = async (db: DbClient, payload: {
    id: string,
    scriptId: string | null,
    opType: string | null,
    payloadJson: string | null,
    createdAt: number | null,
    status: string,
}) => {
    await db.insert(syncOutbox).values({
        id: payload.id,
        scriptId: payload.scriptId,
        opType: payload.opType,
        payloadJson: payload.payloadJson,
        createdAt: payload.createdAt,
        status: payload.status,
    });
};
