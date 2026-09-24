import type {CommentThreadStatus, ScriptCommentMessage, ScriptCommentThread, ScriptCommentThreadSnapshot, ScriptRepository} from '@stagistic/db';
import {useLiveQuery} from '@tanstack/react-db';
import {useMemo} from 'react';

import {useReactiveCollectionStatus} from '../collections';
import {type CreateCommentThreadInput, getScriptCommentsStore} from './scriptCommentsStore';

export interface ScriptCommentsState {
    threads: readonly ScriptCommentThread[];
    messages: readonly ScriptCommentMessage[];
    isLoading: boolean;
    error: Error | null;
    allocateThreadId: () => string;
    createThread: (input: CreateCommentThreadInput) => Promise<ScriptCommentThread | null>;
    reply: (threadId: string, body: string) => Promise<ScriptCommentMessage | null>;
    editMessage: (messageId: string, body: string) => Promise<ScriptCommentMessage | null>;
    deleteMessage: (messageId: string) => Promise<void>;
    setStatus: (threadId: string, status: CommentThreadStatus) => Promise<void>;
    /** Resolves to a snapshot that restoreThread can re-insert (Undo). */
    deleteThread: (threadId: string) => Promise<ScriptCommentThreadSnapshot | null>;
    restoreThread: (snapshot: ScriptCommentThreadSnapshot) => Promise<void>;
    moveBlockAnchors: (fromBlockId: string, toBlockId: string) => Promise<void>;
}

const resolveNull = () => Promise.resolve(null);
const resolveVoid = () => Promise.resolve();

export const useScriptComments = (scriptId: string | null, repository: ScriptRepository): ScriptCommentsState => {
    const store = useMemo(() => (scriptId ? getScriptCommentsStore(repository, scriptId) : null), [repository, scriptId]);
    const threadsStatus = useReactiveCollectionStatus(store?.threadsStatus);
    const messagesStatus = useReactiveCollectionStatus(store?.messagesStatus);
    const threadsQuery = useLiveQuery(
        q => {
            if (!store) {
                return undefined;
            }

            return q.from({thread: store.threadsCollection}).orderBy(({thread}) => thread.createdAt, 'asc');
        },
        [store],
    );
    const messagesQuery = useLiveQuery(
        q => {
            if (!store) {
                return undefined;
            }

            return q.from({message: store.messagesCollection}).orderBy(({message}) => message.createdAt, 'asc');
        },
        [store],
    );

    return useMemo(
        () => ({
            threads: threadsQuery.data ?? [],
            messages: messagesQuery.data ?? [],
            isLoading: Boolean(store) && (!threadsStatus.isReady || !messagesStatus.isReady || threadsQuery.isLoading || messagesQuery.isLoading),
            error: threadsStatus.sourceError ?? messagesStatus.sourceError ?? null,
            allocateThreadId: () => store?.allocateThreadId() ?? '',
            createThread: store?.createThread ?? resolveNull,
            reply: store?.reply ?? resolveNull,
            editMessage: store?.editMessage ?? resolveNull,
            deleteMessage: store?.deleteMessage ?? resolveVoid,
            setStatus: store?.setStatus ?? resolveVoid,
            deleteThread: store?.deleteThread ?? resolveNull,
            restoreThread: store?.restoreThread ?? resolveVoid,
            moveBlockAnchors: store?.moveBlockAnchors ?? resolveVoid,
        }),
        [
            messagesQuery.data,
            messagesQuery.isLoading,
            messagesStatus.isReady,
            messagesStatus.sourceError,
            store,
            threadsQuery.data,
            threadsQuery.isLoading,
            threadsStatus.isReady,
            threadsStatus.sourceError,
        ],
    );
};
