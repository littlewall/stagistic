import {describe, expect, it} from 'vite-plus/test';

import {createTestDb, seedScript} from '../../testing/createTestDb';
import {
    deleteScriptCommentMessage,
    deleteScriptCommentThread,
    insertScriptCommentMessage,
    insertScriptCommentThread,
    type InsertScriptCommentThreadRow,
    listScriptCommentMessages,
    listScriptCommentThreads,
    moveScriptCommentBlockAnchors,
    updateScriptCommentMessageBody,
    updateScriptCommentThreadStatus,
} from './comments';

const thread = (id: string, overrides: Partial<InsertScriptCommentThreadRow> = {}): InsertScriptCommentThreadRow => ({
    id,
    scriptId: 's1',
    anchorKind: 'range',
    anchorBlockId: null,
    quotedText: 'quote',
    status: 'open',
    resolvedAt: null,
    resolvedBy: null,
    createdBy: 'local',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
});

const message = (id: string, threadId: string, createdAt: number) => ({
    id,
    scriptId: 's1',
    threadId,
    authorId: 'local',
    body: `body ${id}`,
    createdAt,
    updatedAt: createdAt,
    editedAt: null,
});

describe('script comment queries', () => {
    it('inserts and lists threads and messages in creation order', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await insertScriptCommentThread(db, thread('t2', {createdAt: 2}));
        await insertScriptCommentThread(db, thread('t1', {createdAt: 1}));
        await insertScriptCommentMessage(db, message('m2', 't1', 2));
        await insertScriptCommentMessage(db, message('m1', 't1', 1));

        expect((await listScriptCommentThreads(db, 's1')).map(row => row.id)).toEqual(['t1', 't2']);
        expect((await listScriptCommentMessages(db, 's1')).map(row => row.id)).toEqual(['m1', 'm2']);
    });

    it('resolves and reopens a thread', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await insertScriptCommentThread(db, thread('t1'));
        await updateScriptCommentThreadStatus(db, {scriptId: 's1', threadId: 't1', status: 'resolved', resolvedAt: 5, resolvedBy: 'local', updatedAt: 5});
        expect((await listScriptCommentThreads(db, 's1'))[0]).toMatchObject({status: 'resolved', resolvedAt: 5, resolvedBy: 'local'});

        await updateScriptCommentThreadStatus(db, {scriptId: 's1', threadId: 't1', status: 'open', resolvedAt: null, resolvedBy: null, updatedAt: 6});
        expect((await listScriptCommentThreads(db, 's1'))[0]).toMatchObject({status: 'open', resolvedAt: null});
    });

    it('moves block anchors from a merged block and returns moved ids', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await insertScriptCommentThread(db, thread('t1', {anchorKind: 'block', anchorBlockId: 'b2'}));
        await insertScriptCommentThread(db, thread('t2', {anchorKind: 'block', anchorBlockId: 'b3', createdAt: 2}));

        const moved = await moveScriptCommentBlockAnchors(db, {scriptId: 's1', fromBlockId: 'b2', toBlockId: 'b1', updatedAt: 9});

        expect(moved).toEqual(['t1']);
        expect((await listScriptCommentThreads(db, 's1')).map(row => row.anchorBlockId)).toEqual(['b1', 'b3']);
    });

    it('edits a message body and stamps editedAt', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await insertScriptCommentThread(db, thread('t1'));
        await insertScriptCommentMessage(db, message('m1', 't1', 1));
        await updateScriptCommentMessageBody(db, {scriptId: 's1', messageId: 'm1', body: 'new', editedAt: 7});

        expect((await listScriptCommentMessages(db, 's1'))[0]).toMatchObject({body: 'new', editedAt: 7, updatedAt: 7});
    });

    it('deletes a single message, and cascades messages when a thread is deleted', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await insertScriptCommentThread(db, thread('t1'));
        await insertScriptCommentMessage(db, message('m1', 't1', 1));
        await insertScriptCommentMessage(db, message('m2', 't1', 2));
        await deleteScriptCommentMessage(db, {scriptId: 's1', messageId: 'm2'});
        expect((await listScriptCommentMessages(db, 's1')).map(row => row.id)).toEqual(['m1']);

        await deleteScriptCommentThread(db, {scriptId: 's1', threadId: 't1'});
        expect(await listScriptCommentThreads(db, 's1')).toEqual([]);
        expect(await listScriptCommentMessages(db, 's1')).toEqual([]);
    });
});
