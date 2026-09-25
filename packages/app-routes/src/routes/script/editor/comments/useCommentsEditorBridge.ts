import type {ScriptCommentsState} from '@stagistic/app-core';
import type {CommentBlockMerge, EditorCommentThreadRef} from '@stagistic/editor';
import {useMemo} from 'react';

import type {CommentsPanelState} from './useCommentsPanelState';

interface UseCommentsEditorBridgeArgs {
    comments: ScriptCommentsState;
    panelState: CommentsPanelState;
    revealPanel: () => void;
    isPanelOpen: () => boolean;
}

/** Thread refs and editor callbacks connecting the editor's comment anchors to the Comments panel. */
export const useCommentsEditorBridge = ({comments, panelState, revealPanel, isPanelOpen}: UseCommentsEditorBridgeArgs) => {
    const commentThreads = useMemo<readonly EditorCommentThreadRef[]>(
        () =>
            comments.threads.map(thread => ({
                id: thread.id,
                status: thread.status === 'resolved' ? 'resolved' : 'open',
                anchorKind: thread.anchorKind === 'block' ? 'block' : 'range',
                anchorBlockId: thread.anchorBlockId,
            })),
        [comments.threads],
    );
    const {requestActivation} = panelState;
    const {moveBlockAnchors} = comments;

    const callbacks = useMemo(
        () => ({
            onRequestRevealComments: revealPanel,
            onCommentAnchorClick: (threadIds: readonly string[]) => {
                // An underline never opens the panel; it only highlights while the panel is open.
                if (isPanelOpen()) {
                    requestActivation(threadIds);
                }
            },
            onCommentBlocksMerged: (merges: readonly CommentBlockMerge[]) => {
                merges.forEach(merge => {
                    void moveBlockAnchors(merge.fromBlockId, merge.toBlockId);
                });
            },
        }),
        [isPanelOpen, moveBlockAnchors, requestActivation, revealPanel],
    );

    return {commentThreads, callbacks};
};
