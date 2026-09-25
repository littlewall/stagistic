import type {
    CommentThreadStatus,
    CreateScriptCommentThreadInput,
    ScriptCommentMessage,
    ScriptCommentThread,
    ScriptCommentThreadSnapshot,
    ScriptRepository,
} from '@stagistic/db';

import {createReactiveCollection, createRepositoryStoreRegistry, toDomainCollectionValue} from '../collections';

export type CreateCommentThreadInput = Omit<CreateScriptCommentThreadInput, 'messageId' | 'timestamp'>;

/*
 * Reads flow through reactive collections; writes go straight to the repository
 * because a thread and its first message are created atomically.
 */
export const createScriptCommentsStore = (repository: ScriptRepository, scriptId: string) => {
    const threads = createReactiveCollection<ScriptCommentThread, string>({
        id: `script-comment-threads:${scriptId}`,
        source: repository.getScriptCommentThreadsSource(scriptId),
        getKey: thread => thread.id,
    });
    const messages = createReactiveCollection<ScriptCommentMessage, string>({
        id: `script-comment-messages:${scriptId}`,
        source: repository.getScriptCommentMessagesSource(scriptId),
        getKey: message => message.id,
    });

    const ready = async () => {
        await Promise.all([threads.collection.preload(), messages.collection.preload()]);
    };

    const readThreadSnapshot = (threadId: string): ScriptCommentThreadSnapshot | null => {
        const thread = threads.collection.get(threadId);

        if (!thread) {
            return null;
        }

        return {
            thread: toDomainCollectionValue(thread),
            messages: [...messages.collection.values()]
                .filter(message => message.threadId === threadId)
                .map(message => toDomainCollectionValue(message))
                .sort((left, right) => left.createdAt - right.createdAt),
        };
    };

    const createThread = (input: CreateCommentThreadInput) => {
        return repository.createScriptCommentThread(scriptId, {
            ...input,
            messageId: repository.allocateScriptCommentMessageId(),
        });
    };

    const reply = (threadId: string, body: string) => {
        return repository.addScriptCommentMessage(scriptId, {
            id: repository.allocateScriptCommentMessageId(),
            threadId,
            body,
        });
    };

    const setStatus = async (threadId: string, status: CommentThreadStatus) => {
        await repository.setScriptCommentThreadStatus(scriptId, threadId, status);
    };

    const deleteThread = async (threadId: string) => {
        const snapshot = readThreadSnapshot(threadId);

        await repository.deleteScriptCommentThread(scriptId, threadId);

        return snapshot;
    };

    return {
        threadsCollection: threads.collection,
        messagesCollection: messages.collection,
        threadsStatus: threads.status,
        messagesStatus: messages.status,
        ready,
        allocateThreadId: () => repository.allocateScriptCommentThreadId(),
        createThread,
        reply,
        editMessage: (messageId: string, body: string) => repository.updateScriptCommentMessage(scriptId, messageId, body),
        deleteMessage: (messageId: string) => repository.deleteScriptCommentMessage(scriptId, messageId),
        setStatus,
        deleteThread,
        restoreThread: (snapshot: ScriptCommentThreadSnapshot) => repository.restoreScriptCommentThread(scriptId, snapshot),
        moveBlockAnchors: (fromBlockId: string, toBlockId: string) => {
            return repository.moveScriptCommentBlockAnchors(scriptId, fromBlockId, toBlockId);
        },
    };
};

export type ScriptCommentsStore = ReturnType<typeof createScriptCommentsStore>;

export const getScriptCommentsStore = createRepositoryStoreRegistry(createScriptCommentsStore);
