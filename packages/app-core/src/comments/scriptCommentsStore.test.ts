import {createInMemoryReactiveQuerySource, type ScriptCommentMessage, type ScriptCommentThread, type ScriptRepository} from '@stagistic/db';
import {describe, expect, it, vi} from 'vite-plus/test';

import {createScriptCommentsStore} from './scriptCommentsStore';

const thread: ScriptCommentThread = {
    id: 't1',
    scriptId: 's1',
    anchorKind: 'range',
    anchorBlockId: null,
    quotedText: 'Q',
    status: 'open',
    resolvedAt: null,
    resolvedBy: null,
    createdBy: 'local',
    createdAt: 1,
    updatedAt: 1,
};
const messages: ScriptCommentMessage[] = [
    {id: 'm2', scriptId: 's1', threadId: 't1', authorId: 'local', body: 'reply', createdAt: 2, updatedAt: 2, editedAt: null},
    {id: 'm1', scriptId: 's1', threadId: 't1', authorId: 'local', body: 'root', createdAt: 1, updatedAt: 1, editedAt: null},
    {id: 'x1', scriptId: 's1', threadId: 'other', authorId: 'local', body: 'other', createdAt: 1, updatedAt: 1, editedAt: null},
];

const createRepository = () => {
    const threads = createInMemoryReactiveQuerySource([thread]);
    const messageSource = createInMemoryReactiveQuerySource(messages);
    let nextMessageId = 1;
    const repository = {
        getScriptCommentThreadsSource: () => threads,
        getScriptCommentMessagesSource: () => messageSource,
        allocateScriptCommentThreadId: () => 't-new',
        allocateScriptCommentMessageId: () => `m-new-${nextMessageId++}`,
        createScriptCommentThread: vi.fn(() => Promise.resolve(thread)),
        addScriptCommentMessage: vi.fn(() => Promise.resolve(messages[0])),
        updateScriptCommentMessage: vi.fn(() => Promise.resolve(messages[0])),
        deleteScriptCommentMessage: vi.fn(() => Promise.resolve()),
        setScriptCommentThreadStatus: vi.fn(() => Promise.resolve(thread)),
        deleteScriptCommentThread: vi.fn(() => Promise.resolve()),
        restoreScriptCommentThread: vi.fn(() => Promise.resolve()),
        moveScriptCommentBlockAnchors: vi.fn(() => Promise.resolve()),
    };

    return repository;
};

describe('script comments store', () => {
    it('creates a thread with a freshly allocated first-message id', async () => {
        const repository = createRepository();
        const store = createScriptCommentsStore(repository as unknown as ScriptRepository, 's1');

        await store.createThread({id: 't-new', anchorKind: 'range', anchorBlockId: null, quotedText: 'Q', body: 'B'});

        expect(repository.createScriptCommentThread).toHaveBeenCalledWith('s1', expect.objectContaining({id: 't-new', messageId: 'm-new-1', body: 'B'}));
    });

    it('replies with a freshly allocated message id', async () => {
        const repository = createRepository();
        const store = createScriptCommentsStore(repository as unknown as ScriptRepository, 's1');

        await store.reply('t1', 'hi');

        expect(repository.addScriptCommentMessage).toHaveBeenCalledWith('s1', {id: 'm-new-1', threadId: 't1', body: 'hi'});
    });

    it('returns a restorable snapshot with messages in creation order when deleting a thread', async () => {
        const repository = createRepository();
        const store = createScriptCommentsStore(repository as unknown as ScriptRepository, 's1');

        await store.ready();
        const snapshot = await store.deleteThread('t1');

        expect(snapshot).toEqual({thread, messages: [messages[1], messages[0]]});
        expect(repository.deleteScriptCommentThread).toHaveBeenCalledWith('s1', 't1');
    });

    it('returns null and still deletes when the thread is unknown', async () => {
        const repository = createRepository();
        const store = createScriptCommentsStore(repository as unknown as ScriptRepository, 's1');

        await store.ready();

        expect(await store.deleteThread('missing')).toBeNull();
        expect(repository.deleteScriptCommentThread).toHaveBeenCalledWith('s1', 'missing');
    });
});
