import {and, asc, eq, type InferInsertModel} from 'drizzle-orm';

import {scriptCommentMessages, scriptCommentThreads} from '../../schema';
import type {DbClient} from '../types';

export type InsertScriptCommentThreadRow = InferInsertModel<typeof scriptCommentThreads>;
export type InsertScriptCommentMessageRow = InferInsertModel<typeof scriptCommentMessages>;

export const listScriptCommentThreads = async (db: DbClient, scriptId: string) => {
    return db
        .select()
        .from(scriptCommentThreads)
        .where(eq(scriptCommentThreads.scriptId, scriptId))
        .orderBy(asc(scriptCommentThreads.createdAt), asc(scriptCommentThreads.id));
};

export const listScriptCommentMessages = async (db: DbClient, scriptId: string) => {
    return db
        .select()
        .from(scriptCommentMessages)
        .where(eq(scriptCommentMessages.scriptId, scriptId))
        .orderBy(asc(scriptCommentMessages.threadId), asc(scriptCommentMessages.createdAt), asc(scriptCommentMessages.id));
};

export const listScriptCommentMessagesByThread = async (db: DbClient, payload: {scriptId: string; threadId: string}) => {
    return db
        .select()
        .from(scriptCommentMessages)
        .where(and(eq(scriptCommentMessages.scriptId, payload.scriptId), eq(scriptCommentMessages.threadId, payload.threadId)))
        .orderBy(asc(scriptCommentMessages.createdAt), asc(scriptCommentMessages.id));
};

export const insertScriptCommentThread = async (db: DbClient, row: InsertScriptCommentThreadRow) => {
    await db.insert(scriptCommentThreads).values(row);
};

export const insertScriptCommentMessage = async (db: DbClient, row: InsertScriptCommentMessageRow) => {
    await db.insert(scriptCommentMessages).values(row);
};

export const bulkInsertScriptCommentThreads = async (db: DbClient, rows: InsertScriptCommentThreadRow[]) => {
    if (rows.length > 0) {
        await db.insert(scriptCommentThreads).values(rows);
    }
};

export const bulkInsertScriptCommentMessages = async (db: DbClient, rows: InsertScriptCommentMessageRow[]) => {
    if (rows.length > 0) {
        await db.insert(scriptCommentMessages).values(rows);
    }
};

export const getScriptCommentThreadById = async (db: DbClient, payload: {scriptId: string; threadId: string}) => {
    const rows = await db
        .select()
        .from(scriptCommentThreads)
        .where(and(eq(scriptCommentThreads.scriptId, payload.scriptId), eq(scriptCommentThreads.id, payload.threadId)))
        .limit(1);

    return rows[0] ?? null;
};

export const getScriptCommentMessageById = async (db: DbClient, payload: {scriptId: string; messageId: string}) => {
    const rows = await db
        .select()
        .from(scriptCommentMessages)
        .where(and(eq(scriptCommentMessages.scriptId, payload.scriptId), eq(scriptCommentMessages.id, payload.messageId)))
        .limit(1);

    return rows[0] ?? null;
};

export const updateScriptCommentThreadStatus = async (
    db: DbClient,
    payload: {scriptId: string; threadId: string; status: string; resolvedAt: number | null; resolvedBy: string | null; updatedAt: number},
) => {
    await db
        .update(scriptCommentThreads)
        .set({status: payload.status, resolvedAt: payload.resolvedAt, resolvedBy: payload.resolvedBy, updatedAt: payload.updatedAt})
        .where(and(eq(scriptCommentThreads.scriptId, payload.scriptId), eq(scriptCommentThreads.id, payload.threadId)));
};

export const moveScriptCommentBlockAnchors = async (
    db: DbClient,
    payload: {scriptId: string; fromBlockId: string; toBlockId: string; updatedAt: number},
): Promise<string[]> => {
    const rows = await db
        .update(scriptCommentThreads)
        .set({anchorBlockId: payload.toBlockId, updatedAt: payload.updatedAt})
        .where(
            and(
                eq(scriptCommentThreads.scriptId, payload.scriptId),
                eq(scriptCommentThreads.anchorKind, 'block'),
                eq(scriptCommentThreads.anchorBlockId, payload.fromBlockId),
            ),
        )
        .returning({id: scriptCommentThreads.id});

    return rows.map(row => row.id);
};

export const updateScriptCommentMessageBody = async (db: DbClient, payload: {scriptId: string; messageId: string; body: string; editedAt: number}) => {
    await db
        .update(scriptCommentMessages)
        .set({body: payload.body, editedAt: payload.editedAt, updatedAt: payload.editedAt})
        .where(and(eq(scriptCommentMessages.scriptId, payload.scriptId), eq(scriptCommentMessages.id, payload.messageId)));
};

export const deleteScriptCommentMessage = async (db: DbClient, payload: {scriptId: string; messageId: string}) => {
    await db.delete(scriptCommentMessages).where(and(eq(scriptCommentMessages.scriptId, payload.scriptId), eq(scriptCommentMessages.id, payload.messageId)));
};

export const deleteScriptCommentThreadsByScriptId = async (db: DbClient, scriptId: string) => {
    await db.delete(scriptCommentThreads).where(eq(scriptCommentThreads.scriptId, scriptId));
};

export const deleteScriptCommentThread = async (db: DbClient, payload: {scriptId: string; threadId: string}) => {
    await db.delete(scriptCommentThreads).where(and(eq(scriptCommentThreads.scriptId, payload.scriptId), eq(scriptCommentThreads.id, payload.threadId)));
};
