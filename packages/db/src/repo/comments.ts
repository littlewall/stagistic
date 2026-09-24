import * as dbQueries from '../queries';
import type {DbClient} from '../queries';
import type {ScriptCommentsRepository} from '../scriptRepository';
import {LOCAL_COMMENT_AUTHOR_ID} from '../types';
import type {GetDb, RecordOutbox, SyncDb} from './types';

interface CreateCommentHandlersArgs {
    getDb: GetDb;
    recordOutbox: RecordOutbox;
    syncDb: SyncDb;
}

interface CommentOutboxEntry {
    scriptId: string;
    entityKey: string;
    opType: string;
    now: number;
    payload: Record<string, unknown>;
}

export const createCommentHandlers = ({getDb, recordOutbox, syncDb}: CreateCommentHandlersArgs): ScriptCommentsRepository => {
    const touchScript = async (tx: DbClient, {scriptId, entityKey, opType, now, payload}: CommentOutboxEntry) => {
        await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
        await recordOutbox(
            {
                scriptId,
                entityKey,
                opType,
                occurredAt: now,
                payloadJson: JSON.stringify({scriptId, ...payload}),
            },
            tx,
        );
    };

    const listThreads: ScriptCommentsRepository['listThreads'] = async scriptId => {
        return dbQueries.listScriptCommentThreads(await getDb(), scriptId);
    };

    const listMessages: ScriptCommentsRepository['listMessages'] = async scriptId => {
        return dbQueries.listScriptCommentMessages(await getDb(), scriptId);
    };

    const create: ScriptCommentsRepository['create'] = async (scriptId, input) => {
        const body = input.body.trim();

        if (!body) {
            return null;
        }

        const db = await getDb();
        const now = input.timestamp ?? Date.now();

        await db.transaction(async tx => {
            await dbQueries.insertScriptCommentThread(tx, {
                id: input.id,
                scriptId,
                anchorKind: input.anchorKind,
                anchorBlockId: input.anchorKind === 'block' ? input.anchorBlockId : null,
                quotedText: input.quotedText,
                status: 'open',
                resolvedAt: null,
                resolvedBy: null,
                createdBy: LOCAL_COMMENT_AUTHOR_ID,
                createdAt: now,
                updatedAt: now,
            });
            await dbQueries.insertScriptCommentMessage(tx, {
                id: input.messageId,
                scriptId,
                threadId: input.id,
                authorId: LOCAL_COMMENT_AUTHOR_ID,
                body,
                createdAt: now,
                updatedAt: now,
                editedAt: null,
            });
            await touchScript(tx, {
                scriptId,
                entityKey: `comment:${input.id}`,
                opType: 'comment.create',
                now,
                payload: {threadId: input.id, messageId: input.messageId},
            });
        });
        await syncDb();

        return dbQueries.getScriptCommentThreadById(db, {scriptId, threadId: input.id});
    };

    const addMessage: ScriptCommentsRepository['addMessage'] = async (scriptId, input) => {
        const body = input.body.trim();

        if (!body) {
            return null;
        }

        const db = await getDb();
        const now = input.timestamp ?? Date.now();

        await db.transaction(async tx => {
            await dbQueries.insertScriptCommentMessage(tx, {
                id: input.id,
                scriptId,
                threadId: input.threadId,
                authorId: LOCAL_COMMENT_AUTHOR_ID,
                body,
                createdAt: now,
                updatedAt: now,
                editedAt: null,
            });
            await touchScript(tx, {
                scriptId,
                entityKey: `comment:${input.threadId}`,
                opType: 'comment.message.add',
                now,
                payload: {threadId: input.threadId, messageId: input.id},
            });
        });
        await syncDb();

        return dbQueries.getScriptCommentMessageById(db, {scriptId, messageId: input.id});
    };

    const updateMessage: ScriptCommentsRepository['updateMessage'] = async (scriptId, messageId, rawBody) => {
        const body = rawBody.trim();

        if (!body) {
            return null;
        }

        const db = await getDb();
        const now = Date.now();

        await db.transaction(async tx => {
            await dbQueries.updateScriptCommentMessageBody(tx, {scriptId, messageId, body, editedAt: now});
            await touchScript(tx, {
                scriptId,
                entityKey: `comment-message:${messageId}`,
                opType: 'comment.message.update',
                now,
                payload: {messageId},
            });
        });
        await syncDb();

        return dbQueries.getScriptCommentMessageById(db, {scriptId, messageId});
    };

    const deleteMessage: ScriptCommentsRepository['deleteMessage'] = async (scriptId, messageId) => {
        const db = await getDb();
        const now = Date.now();

        await db.transaction(async tx => {
            await dbQueries.deleteScriptCommentMessage(tx, {scriptId, messageId});
            await touchScript(tx, {
                scriptId,
                entityKey: `comment-message:${messageId}`,
                opType: 'comment.message.delete',
                now,
                payload: {messageId},
            });
        });
        await syncDb();
    };

    const setStatus: ScriptCommentsRepository['setStatus'] = async (scriptId, threadId, status) => {
        const db = await getDb();
        const now = Date.now();
        const isResolved = status === 'resolved';

        await db.transaction(async tx => {
            await dbQueries.updateScriptCommentThreadStatus(tx, {
                scriptId,
                threadId,
                status,
                resolvedAt: isResolved ? now : null,
                resolvedBy: isResolved ? LOCAL_COMMENT_AUTHOR_ID : null,
                updatedAt: now,
            });
            await touchScript(tx, {
                scriptId,
                entityKey: `comment:${threadId}`,
                opType: isResolved ? 'comment.resolve' : 'comment.reopen',
                now,
                payload: {threadId},
            });
        });
        await syncDb();

        return dbQueries.getScriptCommentThreadById(db, {scriptId, threadId});
    };

    const moveBlockAnchors: ScriptCommentsRepository['moveBlockAnchors'] = async (scriptId, fromBlockId, toBlockId) => {
        const db = await getDb();
        const now = Date.now();
        let movedCount = 0;

        await db.transaction(async tx => {
            const moved = await dbQueries.moveScriptCommentBlockAnchors(tx, {scriptId, fromBlockId, toBlockId, updatedAt: now});

            movedCount = moved.length;

            if (moved.length > 0) {
                await touchScript(tx, {
                    scriptId,
                    entityKey: `comment-block:${fromBlockId}`,
                    opType: 'comment.anchor.move',
                    now,
                    payload: {fromBlockId, toBlockId, threadIds: moved},
                });
            }
        });

        if (movedCount > 0) {
            await syncDb();
        }
    };

    const deleteThread: ScriptCommentsRepository['delete'] = async (scriptId, threadId) => {
        const db = await getDb();
        const now = Date.now();

        await db.transaction(async tx => {
            await dbQueries.deleteScriptCommentThread(tx, {scriptId, threadId});
            await touchScript(tx, {
                scriptId,
                entityKey: `comment:${threadId}`,
                opType: 'comment.delete',
                now,
                payload: {threadId},
            });
        });
        await syncDb();
    };

    const restore: ScriptCommentsRepository['restore'] = async (scriptId, snapshot) => {
        const db = await getDb();
        const now = Date.now();

        await db.transaction(async tx => {
            await dbQueries.insertScriptCommentThread(tx, {...snapshot.thread, scriptId});
            await dbQueries.bulkInsertScriptCommentMessages(
                tx,
                snapshot.messages.map(message => ({...message, scriptId})),
            );
            await touchScript(tx, {
                scriptId,
                entityKey: `comment:${snapshot.thread.id}`,
                opType: 'comment.restore',
                now,
                payload: {threadId: snapshot.thread.id},
            });
        });
        await syncDb();
    };

    return {
        listThreads,
        listMessages,
        create,
        addMessage,
        updateMessage,
        deleteMessage,
        setStatus,
        moveBlockAnchors,
        delete: deleteThread,
        restore,
    };
};
