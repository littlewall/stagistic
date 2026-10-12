import {and, eq} from 'drizzle-orm';

import {scriptCommentMessages, scriptCommentThreads} from '../../../schema';
import {
    existingIds,
    num,
    str,
    type Upserts,
    type WriteContext,
} from './shared';

export const writeThreads = async ({
    tx,
    scriptId,
    now,
}: WriteContext, upserts: Upserts) => {
    for (const [id, record] of Object.entries(upserts)) {
        if (!record) {
            await tx.delete(scriptCommentThreads).where(and(eq(scriptCommentThreads.scriptId, scriptId), eq(scriptCommentThreads.id, id)));
            continue;
        }

        const fields = {
            anchorKind: str(record.anchorKind) ?? 'range',
            anchorBlockId: str(record.anchorBlockId),
            quotedText: str(record.quotedText) ?? '',
            status: str(record.status) ?? 'open',
            resolvedAt: typeof record.resolvedAt === 'number' ? record.resolvedAt : null,
            resolvedBy: str(record.resolvedBy),
            createdBy: str(record.createdBy) ?? '',
            updatedAt: now,
        };

        await tx
            .insert(scriptCommentThreads)
            .values({
                id,
                scriptId,
                ...fields,
                createdAt: num(record.createdAt, now),
            })
            .onConflictDoUpdate({target: scriptCommentThreads.id, set: fields});
    }
};

export const writeMessages = async ({
    tx,
    scriptId,
    now,
}: WriteContext, upserts: Upserts) => {
    const threads = await existingIds(tx, scriptCommentThreads, scriptId);

    for (const [id, record] of Object.entries(upserts)) {
        if (!record) {
            await tx.delete(scriptCommentMessages).where(and(eq(scriptCommentMessages.scriptId, scriptId), eq(scriptCommentMessages.id, id)));
            continue;
        }

        const threadId = str(record.threadId);

        if (threadId === null || !threads.has(threadId)) {
            continue;
        }

        const fields = {
            threadId,
            authorId: str(record.authorId) ?? '',
            body: str(record.body) ?? '',
            editedAt: typeof record.editedAt === 'number' ? record.editedAt : null,
            updatedAt: now,
        };

        await tx
            .insert(scriptCommentMessages)
            .values({
                id,
                scriptId,
                ...fields,
                createdAt: num(record.createdAt, now),
            })
            .onConflictDoUpdate({target: scriptCommentMessages.id, set: fields});
    }
};

/** Parents before children (FK order). */
