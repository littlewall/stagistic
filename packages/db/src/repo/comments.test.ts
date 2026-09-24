import {describe, expect, it, vi} from 'vite-plus/test';

import {createTestDb, seedScript} from '../testing/createTestDb';
import {createCommentHandlers} from './comments';

const setup = async () => {
    const {db} = await createTestDb();

    await seedScript(db, 's1');

    const recordOutbox = vi.fn(() => Promise.resolve());
    const syncDb = vi.fn(() => Promise.resolve());
    const handlers = createCommentHandlers({getDb: () => Promise.resolve(db), recordOutbox, syncDb});

    return {db, handlers, recordOutbox, syncDb};
};

const createInput = {id: 't1', messageId: 'm1', anchorKind: 'range' as const, anchorBlockId: null, quotedText: 'Hi', body: '  Fix rhyme  ', timestamp: 10};

describe('comment handlers', () => {
    it('creates a thread with its first message atomically, trimmed, and syncs', async () => {
        const {handlers, syncDb, recordOutbox} = await setup();

        const thread = await handlers.create('s1', createInput);

        expect(thread).toMatchObject({id: 't1', status: 'open', createdBy: 'local', quotedText: 'Hi'});
        expect(await handlers.listMessages('s1')).toMatchObject([{id: 'm1', threadId: 't1', body: 'Fix rhyme', authorId: 'local'}]);
        expect(syncDb).toHaveBeenCalledTimes(1);
        expect(recordOutbox).toHaveBeenCalledWith(expect.objectContaining({opType: 'comment.create', entityKey: 'comment:t1'}), expect.anything());
    });

    it('rejects an empty body without writing', async () => {
        const {handlers, syncDb} = await setup();

        expect(await handlers.create('s1', {...createInput, body: '   '})).toBeNull();
        expect(await handlers.listThreads('s1')).toEqual([]);
        expect(syncDb).not.toHaveBeenCalled();
    });

    it('resolves with resolver metadata and reopens clearing it', async () => {
        const {handlers} = await setup();

        await handlers.create('s1', createInput);
        expect(await handlers.setStatus('s1', 't1', 'resolved')).toMatchObject({status: 'resolved', resolvedBy: 'local'});
        expect(await handlers.setStatus('s1', 't1', 'open')).toMatchObject({status: 'open', resolvedBy: null, resolvedAt: null});
    });

    it('adds, edits and deletes replies', async () => {
        const {handlers} = await setup();

        await handlers.create('s1', createInput);
        await handlers.addMessage('s1', {id: 'm2', threadId: 't1', body: 'reply', timestamp: 11});
        expect(await handlers.updateMessage('s1', 'm2', 'edited reply')).toMatchObject({body: 'edited reply'});
        await handlers.deleteMessage('s1', 'm2');
        expect((await handlers.listMessages('s1')).map(row => row.id)).toEqual(['m1']);
    });

    it('deletes a thread and restores it from a snapshot', async () => {
        const {handlers} = await setup();

        await handlers.create('s1', createInput);
        await handlers.addMessage('s1', {id: 'm2', threadId: 't1', body: 'reply', timestamp: 11});

        const snapshot = {thread: (await handlers.listThreads('s1'))[0], messages: await handlers.listMessages('s1')};

        await handlers.delete('s1', 't1');
        expect(await handlers.listThreads('s1')).toEqual([]);

        await handlers.restore('s1', snapshot);
        expect((await handlers.listThreads('s1')).map(row => row.id)).toEqual(['t1']);
        expect((await handlers.listMessages('s1')).map(row => row.id)).toEqual(['m1', 'm2']);
    });

    it('moves block anchors', async () => {
        const {handlers} = await setup();

        await handlers.create('s1', {...createInput, anchorKind: 'block', anchorBlockId: 'b2'});
        await handlers.moveBlockAnchors('s1', 'b2', 'b1');
        expect((await handlers.listThreads('s1'))[0].anchorBlockId).toBe('b1');
    });
});
