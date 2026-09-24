import {useCallback, useMemo, useSyncExternalStore} from 'react';

import {useEditorInstance} from '../context';
import {useFocusEditorBlock} from '../hooks/useFocusEditorBlock';
import {commentsPluginKey, type CommentsPluginState} from '../tiptap/extensions/comments';

export interface EditorCommentsApi {
    state: CommentsPluginState | null;
    startDraft: () => void;
    cancelDraft: () => void;
    commitDraft: (threadId: string) => void;
    removeAnchor: (threadId: string) => void;
    restoreAnchor: (threadId: string) => void;
    setActive: (threadId: string | null) => void;
    setHovered: (threadId: string | null) => void;
    revealAnchor: (threadId: string) => void;
}

/** Comments plugin state and commands for UI rendered inside the editor context. */
export const useEditorComments = (): EditorCommentsApi => {
    const editor = useEditorInstance();
    const focusBlock = useFocusEditorBlock();
    const subscribe = useCallback(
        (listener: () => void) => {
            editor?.on('transaction', listener);

            return () => {
                editor?.off('transaction', listener);
            };
        },
        [editor],
    );
    const getSnapshot = useCallback(() => (editor && !editor.isDestroyed ? (commentsPluginKey.getState(editor.state) ?? null) : null), [editor]);
    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    return useMemo(
        () => ({
            state,
            startDraft: () => {
                editor?.commands.startCommentDraft();
            },
            cancelDraft: () => {
                editor?.chain().cancelCommentDraft().focus().run();
            },
            commitDraft: threadId => {
                editor?.commands.commitCommentDraft(threadId);
            },
            removeAnchor: threadId => {
                editor?.commands.removeCommentAnchor(threadId);
            },
            restoreAnchor: threadId => {
                editor?.commands.restoreCommentAnchor(threadId);
            },
            setActive: threadId => {
                editor?.commands.setActiveCommentThread(threadId);
            },
            setHovered: threadId => {
                editor?.commands.setHoveredCommentThread(threadId);
            },
            revealAnchor: threadId => {
                const anchor = state?.anchors.get(threadId);

                if (anchor) {
                    focusBlock(anchor.blockId);
                    editor?.commands.setActiveCommentThread(threadId);
                }
            },
        }),
        [editor, focusBlock, state],
    );
};
